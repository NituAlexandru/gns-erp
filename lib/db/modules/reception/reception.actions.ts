import mongoose, { Types } from 'mongoose'
import ReceptionModel, { IInvoice, IReceptionDoc } from './reception.model'
import { reverseStockMovementsByReference } from '../inventory/inventory.actions.core'
import { getStockableItemDetails } from './utils'
import { ReceptionCreateSchema, ReceptionUpdateSchema } from './validator'
import {
  PopulatedReception,
  ReceptionCreateInput,
  ReceptionUpdateInput,
} from './types'
import z from 'zod'
import { connectToDatabase } from '../..'
import Supplier from '../suppliers/supplier.model'
import User, { IUser } from '../user/user.model'
import {
  calculateInvoiceTotals,
  distributeTransportCost,
  runTransactionWithRetry,
} from './reception.helpers'
import { convertAmountToRON, sumToTwoDecimals } from '@/lib/finance/money'
import { ISupplierDoc } from '../suppliers/types'
import ERPProductModel, { IERPProductDoc } from '../product/product.model'
import { IPackagingDoc } from '../packaging-products/types'
import PackagingModel from '../packaging-products/packaging.model'
import { addOrUpdateSupplierForProduct } from '../product/product.actions'
import { addOrUpdateSupplierForPackaging } from '../packaging-products/packaging.actions'
import { recordStockMovement } from '../inventory/inventory.actions.core'
import { round2, round6 } from '@/lib/utils'
import SupplierOrderModel from '../supplier-orders/supplier-order.model'
import {
  addReceptionToOrder,
  removeReceptionFromOrder,
} from '../supplier-orders/supplier-order.actions'
import NirModel from '../financial/nir/nir.model'

export type ActionResultWithData<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string }

export type ActionResult =
  | { success: true; message: string }
  | { success: false; message: string }

function processReceptionInputData(
  data: ReceptionCreateInput | ReceptionUpdateInput,
) {
  const processedData = { ...data }

  processedData.deliveries =
    (data.deliveries
      ?.filter((d) => d.dispatchNoteNumber?.trim() !== '')
      .map((d) => {
        // Asigurăm numere
        const cost = typeof d.transportCost === 'number' ? d.transportCost : 0
        const rate =
          typeof d.transportVatRate === 'number' ? d.transportVatRate : 0

        // Calculăm valoarea TVA
        const vatValue = round2(cost * (rate / 100))

        return {
          ...d,
          transportCost: cost,
          transportVatRate: rate,
          transportVatValue: vatValue, // Salvăm valoarea calculată
        }
      }) as any[]) || []

  processedData.invoices =
    (data.invoices
      ?.map((invoice) => {
        if (invoice.number && invoice.number.trim() !== '') {
          const amount = typeof invoice.amount === 'number' ? invoice.amount : 0
          const vatRate =
            typeof invoice.vatRate === 'number' ? invoice.vatRate : 0
          const vatValue = round2(amount * (vatRate / 100))
          const totalWithVat = round2(amount + vatValue)
          return { ...invoice, vatValue, totalWithVat }
        }
        return null
      })
      .filter(Boolean) as IInvoice[]) || []

  return processedData
}

export async function createReception(
  data: ReceptionCreateInput,
): Promise<ActionResultWithData<PopulatedReception>> {
  await connectToDatabase()

  try {
    const payloadToValidate = processReceptionInputData(data)
    const payload = ReceptionCreateSchema.parse(payloadToValidate)

    const [creator, supplier, productsData, packagingData] = await Promise.all([
      User.findById(payload.createdBy).lean<IUser>(),
      Supplier.findById(payload.supplier).lean<ISupplierDoc>(), // Folosim 'Supplier', nu 'SupplierModel'
      ERPProductModel.find({
        _id: { $in: (payload.products || []).map((item) => item.product) },
      }).lean<IERPProductDoc[]>(), // <-- Am adăugat '[]' la tip
      PackagingModel.find({
        _id: {
          $in: (payload.packagingItems || []).map((item) => item.packaging),
        },
      }).lean<IPackagingDoc[]>(), // <-- Am adăugat '[]' la tip
    ])

    if (!creator) throw new Error('Utilizatorul creator nu a fost găsit.')
    if (!supplier) throw new Error('Furnizorul nu a fost găsit.')

    const productsMap = new Map(
      productsData.map((p: IERPProductDoc) => [p._id.toString(), p]),
    )
    const packagingMap = new Map(
      packagingData.map((p: IPackagingDoc) => [p._id.toString(), p]),
    )

    const payloadWithSnapshots = {
      ...payload,
      createdByName: creator.name,
      supplierSnapshot: {
        name: supplier.name,
        cui: supplier.fiscalCode || undefined,
        regCom: supplier.regComNumber || undefined,
        address: supplier.address,
        iban: supplier.bankAccountLei?.iban || undefined,
      },
      products: (payload.products || []).map((item) => {
        const productDoc = productsMap.get(item.product)
        if (!productDoc)
          throw new Error(`Produsul cu ID ${item.product} nu a fost găsit.`)
        return {
          ...item,
          productName: productDoc.name,
          productCode: productDoc.productCode || 'N/A',
          documentQuantity: item.documentQuantity ?? item.quantity,
        }
      }),
      packagingItems: (payload.packagingItems || []).map((item) => {
        const packagingDoc = packagingMap.get(item.packaging)
        if (!packagingDoc)
          throw new Error(`Ambalajul cu ID ${item.packaging} nu a fost găsit.`)
        return {
          ...item,
          packagingName: packagingDoc.name,
          productCode: packagingDoc.productCode || 'N/A',
          documentQuantity: item.documentQuantity ?? item.quantity,
        }
      }),
    }
    // --- Sfârșit logică snapshot-uri ---

    const newReception = await ReceptionModel.create(payloadWithSnapshots)

    return {
      success: true,
      message: 'Recepție salvată ca ciornă.',
      data: JSON.parse(JSON.stringify(newReception)),
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const formattedErrors = JSON.stringify(
        error.flatten().fieldErrors,
        null,
        2,
      )
      console.error('Eroare de validare Zod:', formattedErrors)
      return {
        success: false,
        message: `Datele trimise sunt invalide. Erori: ${formattedErrors}`,
      }
    }
    console.error('Eroare la crearea recepției:', error)
    const message =
      error instanceof Error ? error.message : 'Eroare la crearea recepției.'
    return { success: false, message }
  }
}

export async function updateReception(
  data: ReceptionUpdateInput,
): Promise<ActionResultWithData<PopulatedReception>> {
  try {
    const payloadToValidate = processReceptionInputData(data)
    const payload = ReceptionUpdateSchema.parse(payloadToValidate)
    const { _id, ...updateData } = payload

    const [creator, supplier, productsData, packagingData] = await Promise.all([
      User.findById(updateData.createdBy).lean<IUser>(),
      Supplier.findById(updateData.supplier).lean<ISupplierDoc>(), // Folosim 'Supplier'
      ERPProductModel.find({
        _id: { $in: (updateData.products || []).map((item) => item.product) },
      }).lean<IERPProductDoc[]>(),
      PackagingModel.find({
        _id: {
          $in: (updateData.packagingItems || []).map((item) => item.packaging),
        },
      }).lean<IPackagingDoc[]>(),
    ])

    if (!creator) throw new Error('Utilizatorul creator nu a fost găsit.')
    if (!supplier) throw new Error('Furnizorul nu a fost găsit.')

    const productsMap = new Map(
      productsData.map((p: IERPProductDoc) => [p._id.toString(), p]),
    )
    const packagingMap = new Map(
      packagingData.map((p: IPackagingDoc) => [p._id.toString(), p]),
    )

    const updateDataWithSnapshots = {
      ...updateData,
      createdByName: creator.name,
      supplierSnapshot: {
        name: supplier.name,
        cui: supplier.fiscalCode || undefined,
        regCom: supplier.regComNumber || undefined,
      },
      products: (updateData.products || []).map((item) => {
        const productDoc = productsMap.get(item.product)
        if (!productDoc)
          throw new Error(`Produsul cu ID ${item.product} nu a fost găsit.`)
        return {
          ...item,
          productName: productDoc.name,
          productCode: productDoc.productCode || 'N/A', // (Verifică 'productCode')
          documentQuantity: item.documentQuantity ?? item.quantity,
        }
      }),
      packagingItems: (updateData.packagingItems || []).map((item) => {
        const packagingDoc = packagingMap.get(item.packaging)
        if (!packagingDoc)
          throw new Error(`Ambalajul cu ID ${item.packaging} nu a fost găsit.`)
        return {
          ...item,
          packagingName: packagingDoc.name,
          packagingCode: packagingDoc.productCode || 'N/A',
          documentQuantity: item.documentQuantity ?? item.quantity,
        }
      }),
    }
    // --- Sfârșit logică snapshot-uri ---

    // Folosim payload-ul îmbogățit
    const updatedReception = await ReceptionModel.findByIdAndUpdate(
      _id,
      updateDataWithSnapshots,
      { new: true },
    )
    if (!updatedReception) {
      throw new Error(
        'Recepția pe care încerci să o modifici nu a fost găsită.',
      )
    }

    return {
      success: true,
      message: 'Recepție actualizată cu succes.',
      data: JSON.parse(JSON.stringify(updatedReception)),
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const formattedErrors = JSON.stringify(
        error.flatten().fieldErrors,
        null,
        2,
      )
      console.error('Eroare de validare Zod la update:', formattedErrors)
      return {
        success: false,
        message: `Datele trimise sunt invalide. Erori: ${formattedErrors}`,
      }
    }
    const message =
      error instanceof Error
        ? error.message
        : 'Eroare la actualizarea recepției.'
    return { success: false, message }
  }
}

// TODO (Proiecte): De refactorizat când Proiectele au sub-locații.
// Locația ar trebui să fie o combinație, ex: `proiectId_DEPOZIT`.
export async function confirmReception({
  receptionId,
  userId,
}: {
  receptionId: string
  userId: string
}): Promise<ActionResultWithData<PopulatedReception>> {
  await connectToDatabase()

  console.time('EXECUTION_TIMER')
  // console.log('1. [START] confirmReception a pornit')

  const initialData = await ReceptionModel.findById(receptionId).lean()

  if (!initialData)
    return { success: false, message: 'Recepția nu a fost găsită.' }
  if (initialData.status === 'CONFIRMAT')
    return { success: false, message: 'Recepția este deja confirmată.' }

  // Pregătim lista de produse și ambalaje
  const allItemsToFetch = [
    ...(initialData.products || []).map((p) => ({
      id: p.product.toString(),
      type: 'ERPProduct' as const,
    })),
    ...(initialData.packagingItems || []).map((p) => ({
      id: p.packaging.toString(),
      type: 'Packaging' as const,
    })),
  ]

  // Le citim pe toate o singură dată și le punem într-o mapă
  const itemDetailsMap = new Map<string, any>()
  await Promise.all(
    allItemsToFetch.map(async (item) => {
      const details = await getStockableItemDetails(item.id, item.type)
      itemDetailsMap.set(item.id, details)
    }),
  )

  try {
    // console.log(
    //   `2. [PRE-FETCH] Gata. Map size: ${itemDetailsMap.size}. Încep tranzacția...`,
    // )
    return await runTransactionWithRetry(async (session) => {
      // console.log('3. [TRX] Sesiune deschisă. Citesc recepția...')
      const reception = await ReceptionModel.findById(receptionId)
        .populate<{
          supplier: { _id: Types.ObjectId; name: string }
        }>('supplier', 'name')
        .session(session)

      if (!reception) {
        throw new Error('Recepția nu a fost găsită.')
      }
      if (reception.status === 'CONFIRMAT') {
        throw new Error('Recepția este deja confirmată.')
      }

      const linkedOrder = reception.orderRef
        ? await SupplierOrderModel.findById(reception.orderRef)
            .select('supplierOrderNumber')
            .session(session)
        : null

      const supplierOrderNumberFromDb = linkedOrder?.supplierOrderNumber

      const supplierIdStr = (reception.supplier as any)._id.toString()
      const supplierName = (reception.supplier as any).name

      let targetLocation: string

      if (reception.destinationType === 'PROIECT' && reception.destinationId) {
        targetLocation = reception.destinationId.toString()
      } else {
        targetLocation = reception.destinationLocation
      }

      const totalTransportCost = reception.deliveries.reduce(
        (sum, delivery) => sum + (delivery.transportCost || 0),
        0,
      )
      const productsToProcess = reception.products || [] // Pas 2: Distribuim costul total de transport PONDERAT doar pe lista de produse.

      const productsWithTransportCost = distributeTransportCost(
        productsToProcess,
        totalTransportCost,
      ) // Pas 3: Creăm o listă pentru ambalaje cu cost de transport ZERO,
      // menținând o structură compatibilă pentru bucla principală.
      // Presupunem că `distributeTransportCost` returnează un array de obiecte
      // cu o cheie `totalDistributedTransportCost`.

      const packagingsWithZeroTransportCost = (
        reception.packagingItems || []
      ).map((item) => ({
        originalItem: item, // Păstrăm referința la item-ul original
        totalDistributedTransportCost: 0, // Setăm explicit costul la 0
      })) // Pas 4: Reconstruim listele în ordinea inițială (produse, apoi ambalaje)
      // pentru a asigura funcționarea corectă a buclei de mai jos.

      const allOriginalItems = [
        ...productsToProcess,
        ...(reception.packagingItems || []),
      ]
      const itemsWithTransportCost = [
        ...productsWithTransportCost,
        ...packagingsWithZeroTransportCost,
      ]

      reception.invoices = calculateInvoiceTotals(reception.invoices)

      // === VALIDARE FINALIZARE (fără TVA, în RON) ===
      const merchandiseTotalRON = round2(
        (reception.products || []).reduce(
          (sum, it) => sum + (it.invoicePricePerUnit ?? 0) * (it.quantity ?? 0),
          0,
        ) +
          (reception.packagingItems || []).reduce(
            (sum, it) =>
              sum + (it.invoicePricePerUnit ?? 0) * (it.quantity ?? 0),
            0,
          ),
      )

      const transportTotalRON = round2(
        (reception.deliveries || []).reduce(
          (sum, d) => sum + (d.transportCost || 0),
          0,
        ),
      )

      // total facturi fără TVA în RON (cu curs, dacă e cazul)
      const invoicesTotalRON = round2(
        sumToTwoDecimals(
          (reception.invoices || []).map((inv: IInvoice) =>
            convertAmountToRON(
              typeof inv.amount === 'number' ? inv.amount : 0,
              inv.currency || 'RON',
              inv.exchangeRateOnIssueDate,
            ),
          ),
        ),
      )

      // valută ≠ RON => curs obligatoriu
      for (const inv of reception.invoices || []) {
        if (inv.currency !== 'RON') {
          const fx = inv.exchangeRateOnIssueDate
          if (!fx || fx <= 0) {
            throw new Error(
              `Factura ${inv.series || ''} ${inv.number}: lipsește exchangeRateOnIssueDate pentru moneda ${inv.currency}.`,
            )
          }
        }
      }

      const internalTransportVal = (reception.deliveries || []).reduce(
        (acc, d) => {
          // Verificăm dacă livrarea are flag-ul isInternal (salvat în baza de date)
          // Sau, pentru siguranță, verificăm și tipul
          const isInt = (d as any).isInternal || d.transportType === 'INTERN'

          if (isInt) {
            return acc + (d.transportCost || 0)
          }
          return acc
        },
        0,
      )

      const expectedNoVatRON = round2(merchandiseTotalRON + transportTotalRON)

      if (
        round2(invoicesTotalRON + internalTransportVal) !== expectedNoVatRON
      ) {
        throw new Error(
          `Total facturi (${invoicesTotalRON} RON) + Transport Intern (${internalTransportVal} RON) ≠ Total marfă + transport (${expectedNoVatRON} RON).`,
        )
      }

      // === SCRIERE COSTURI & INVENTAR ===
      for (let i = 0; i < allOriginalItems.length; i++) {
        const rawItem = allOriginalItems[i]
        // console.log(
        //   `4. [LOOP] Procesez item ${i + 1} (ID: ${'product' in rawItem ? rawItem.product : rawItem.packaging})`,
        // )
        const item = allOriginalItems[i]
        const transportData = itemsWithTransportCost[i]

        if (
          item.invoicePricePerUnit === null ||
          typeof item.invoicePricePerUnit === 'undefined' ||
          item.invoicePricePerUnit < 0
        ) {
          throw new Error(
            'Prețul de factură (fără TVA) lipsește pentru cel puțin un articol.',
          )
        }

        const itemType = 'product' in item ? 'ERPProduct' : 'Packaging'
        const itemId = 'product' in item ? item.product : item.packaging

        const details = itemDetailsMap.get(itemId.toString())

        if (!details)
          throw new Error(
            `Detaliile pentru ${itemId} nu au putut fi recuperate.`,
          )

        // 1. Calculăm cantitatea în unitatea de BAZĂ
        let baseQuantity = 0
        let baseDocumentQuantity = 0
        let conversionFactor = 1

        const rawDocumentQty = item.documentQuantity ?? item.quantity

        switch (item.unitMeasure) {
          case details.unit:
            baseQuantity = item.quantity
            baseDocumentQuantity = rawDocumentQty
            conversionFactor = 1
            break
          case details.packagingUnit:
            if (!details.packagingQuantity || details.packagingQuantity <= 0)
              throw new Error(
                `Factor de conversie 'packagingQuantity' invalid pentru ${itemId}.`,
              )
            baseQuantity = item.quantity * details.packagingQuantity
            baseDocumentQuantity = rawDocumentQty * details.packagingQuantity
            conversionFactor = details.packagingQuantity
            break
          case 'palet':
            if (!details.itemsPerPallet || details.itemsPerPallet <= 0)
              throw new Error(
                `Factor de conversie 'itemsPerPallet' invalid pentru ${itemId}.`,
              )
            const totalBaseUnitsPerPallet = details.packagingQuantity
              ? details.itemsPerPallet * details.packagingQuantity
              : details.itemsPerPallet
            if (totalBaseUnitsPerPallet <= 0)
              throw new Error(
                `Calculul unităților pe palet a eșuat pentru ${itemId}.`,
              )
            baseQuantity = item.quantity * totalBaseUnitsPerPallet
            baseDocumentQuantity = rawDocumentQty * totalBaseUnitsPerPallet
            conversionFactor = totalBaseUnitsPerPallet
            break
          default:
            throw new Error(
              `Unitate de măsură '${item.unitMeasure}' invalidă pentru ${itemId}.`,
            )
        }

        if (baseQuantity === 0) continue

        // 2. Calculăm TOATE costurile pe unitatea de BAZĂ
        const invoicePricePerBaseUnit = round6(
          item.invoicePricePerUnit / conversionFactor,
        )
        const totalDistributedTransport =
          transportData.totalDistributedTransportCost || 0

        const distributedTransportCostPerBaseUnit = round6(
          totalDistributedTransport / baseQuantity,
        )

        const landedCostPerUnit = round6(
          invoicePricePerBaseUnit + distributedTransportCostPerBaseUnit,
        )
        const vatValuePerUnit = round6(
          invoicePricePerBaseUnit * (item.vatRate / 100),
        )

        // Salvăm valorile originale introduse de utilizator
        item.originalQuantity = item.quantity
        item.originalUnitMeasure = item.unitMeasure
        item.originalInvoicePricePerUnit = item.invoicePricePerUnit
        item.originalDocumentQuantity = rawDocumentQty

        // 3. SUPRASCRIEM DATELE PE DOCUMENTUL DE RECEPȚIE CU VALORILE STANDARD
        item.quantity = baseQuantity
        item.documentQuantity = baseDocumentQuantity
        item.unitMeasure = details.unit! // Forțăm unitatea de măsură de bază
        item.invoicePricePerUnit = invoicePricePerBaseUnit // Forțăm prețul pe unitatea de bază
        item.distributedTransportCostPerUnit =
          distributedTransportCostPerBaseUnit
        item.totalDistributedTransportCost = totalDistributedTransport
        item.landedCostPerUnit = landedCostPerUnit
        item.vatValuePerUnit = vatValuePerUnit

        // console.log('      > [DEBUG] Start Update Supplier...')
        // --- NOU: 4. Actualizăm Furnizorul Produsului (Auto-Discovery) ---
        if (itemType === 'ERPProduct') {
          const productItem = item as (typeof reception.products)[0]

          await addOrUpdateSupplierForProduct(
            itemId.toString(),
            supplierIdStr,
            item.landedCostPerUnit,
            productItem.productCode, // Aici folosim productCode
            session,
          )
        } else {
          // Aici item este un ambalaj
          const packagingItem = item as (typeof reception.packagingItems)[0]

          await addOrUpdateSupplierForPackaging(
            itemId.toString(),
            supplierIdStr,
            item.landedCostPerUnit,
            packagingItem.productCode,
            session,
          )
        }
        // console.log('      > [DEBUG] Supplier Updated. Start Stock Movement...')
        // 4. Trimitem datele CURATE și STANDARDIZATE la inventar
        await recordStockMovement(
          {
            stockableItem: itemId.toString(),
            stockableItemType: itemType,
            movementType: 'RECEPTIE',
            itemName: details.name,
            itemCode: details.productCode || '',
            unitMeasure: item.unitMeasure,
            quantity: item.quantity,
            locationTo: targetLocation,
            referenceId: reception._id.toString(),
            note: `Recepție ${details.name} de la furnizor ${supplierName}`,
            unitCost: item.landedCostPerUnit,
            responsibleUser: userId,
            supplierId: supplierIdStr,
            supplierName: supplierName,
            qualityDetails: item.qualityDetails,
            timestamp: new Date(),
            receptionRef: reception._id.toString(),
            orderRef: reception.orderRef
              ? reception.orderRef.toString()
              : undefined,
            supplierOrderNumber: supplierOrderNumberFromDb,
          },
          session,
        )
        // console.log('      > [DEBUG] Stock Movement Recorded.')
      }
      // console.log('5. [SAVE] Bucla gata. Salvez statusul CONFIRMAT...')
      reception.status = 'CONFIRMAT'

      await reception.save({ session })

      // --- COD NOU PENTRU ACTUALIZARE COMANDĂ ---
      if (reception.orderRef) {
        // 1. Calculăm valoarea totală din FACTURI (Preferabil)
        const invoiceTotalWithVat = (reception.invoices || []).reduce(
          (sum, inv) => sum + (inv.totalWithVat || 0),
          0,
        )

        // 2. Calculăm manual valoarea TOTALĂ (Brut: Net + TVA) ca fallback

        // A. Produse
        const productsTotal = (reception.products || []).reduce((acc, p) => {
          const val = (p.quantity || 0) * (p.invoicePricePerUnit || 0)
          const vat = val * ((p.vatRate || 0) / 100)
          return acc + val + vat
        }, 0)

        // B. Ambalaje
        const packagingTotal = (reception.packagingItems || []).reduce(
          (acc, p) => {
            const val = (p.quantity || 0) * (p.invoicePricePerUnit || 0)
            const vat = val * ((p.vatRate || 0) / 100)
            return acc + val + vat
          },
          0,
        )

        // C. Transport (Aici folosim noile câmpuri calculate în processReceptionInputData)
        const transportTotal = (reception.deliveries || []).reduce((acc, d) => {
          const cost = d.transportCost || 0
          // Folosim valoarea TVA salvată (dacă există) sau o recalculăm
          const vat =
            d.transportVatValue ?? cost * ((d.transportVatRate || 0) / 100)
          return acc + cost + vat
        }, 0)

        const fallbackTotal = productsTotal + packagingTotal + transportTotal

        // Alegem valoarea finală
        const finalTotalValue =
          invoiceTotalWithVat > 0 ? invoiceTotalWithVat : fallbackTotal

        // Apelăm funcția importată care face update la comandă
        await addReceptionToOrder(
          reception.orderRef.toString(),
          {
            _id: reception._id.toString(),
            receptionNumber:
              reception.deliveries?.[0]?.dispatchNoteNumber ||
              'Recepție Sistem',
            receptionDate: reception.receptionDate,
            totalValue: finalTotalValue,
            products: reception.products.map((p) => ({
              product: p.product.toString(),
              quantity: p.quantity,
            })),
            packagingItems: reception.packagingItems.map((p) => ({
              packaging: p.packaging.toString(),
              quantity: p.quantity,
            })),
          },
          session,
        )
      }
      // -------------------------------------------

      return {
        success: true,
        message: 'Recepție confirmată și stoc actualizat!',
        data: JSON.parse(JSON.stringify(reception)),
      }
    })
  } catch (error: unknown) {
    console.error('Eroare la confirmarea recepției:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Eroare la confirmarea recepției.'
    // console.timeEnd('EXECUTION_TIMER')
    // console.log('6. [DONE] Totul salvat cu succes!')
    return { success: false, message }
  }
}

// TODO (Proiecte): De refactorizat când Proiectele au sub-locații.
// Logica trebuie să fie identică cu cea de la confirmReception.
export async function revokeConfirmation(
  receptionId: string,
  userId: string,
  userName: string,
): Promise<ActionResultWithData<PopulatedReception>> {
  const session = await mongoose.startSession()
  try {
    const result = await session.withTransaction(async (session) => {
      const reception = await ReceptionModel.findById(receptionId)
        .populate({
          path: 'products.product',
          model: 'ERPProduct',
          select: 'packagingUnit packagingQuantity itemsPerPallet',
        })
        .populate({
          path: 'packagingItems.packaging',
          model: 'Packaging',
          select: 'packagingQuantity',
        })
        .session(session)

      if (!reception) {
        return { success: false, message: 'Recepția nu a fost găsită.' }
      }
      if (reception.status !== 'CONFIRMAT') {
        return {
          success: false,
          message: 'Doar o recepție confirmată poate fi revocată.',
        }
      }

      // Verificăm dacă există un NIR asociat
      if (reception.nirId) {
        // A. Anulăm NIR-ul (Logica din cancelNir mutată aici în tranzacție)
        await NirModel.findByIdAndUpdate(
          reception.nirId,
          {
            status: 'CANCELLED',
            cancellationReason: 'Revocare automată (Recepție revocată)',
            cancelledAt: new Date(),
            cancelledBy: new Types.ObjectId(userId),
            cancelledByName: userName,
          },
          { session },
        )

        // B. Rupem legătura din Recepție
        // Setăm pe undefined ca să dispară din DB și să permită generarea unuia nou
        reception.nirId = undefined
        reception.nirNumber = undefined
        reception.nirDate = undefined
      }
      // --------------------------------

      await reverseStockMovementsByReference(receptionId, session)

      // --- INSERT: ACTUALIZARE COMANDĂ (SCĂDERE) ---
      // IMPORTANT: Facem asta ACUM, cât timp avem cantitățile MARI (convertite) pe recepție
      if (reception.orderRef) {
        const itemsToSubtract = {
          products: reception.products.map((p) => ({
            // FIX: Luăm ._id pentru că p.product este POPULAT (este obiect întreg)
            product: (p.product as any)._id.toString(),
            quantity: p.quantity,
          })),
          packagingItems: reception.packagingItems.map((p) => ({
            // FIX: La fel și aici
            packaging: (p.packaging as any)._id.toString(),
            quantity: p.quantity,
          })),
        }

        await removeReceptionFromOrder(
          reception.orderRef.toString(),
          reception._id.toString(),
          itemsToSubtract,
          session,
        )
      }
      // ---------------------------------------------

      const allItems = [
        ...(reception.products || []),
        ...(reception.packagingItems || []),
      ]

      for (const item of allItems) {
        if (
          item.originalQuantity &&
          item.originalUnitMeasure &&
          item.originalInvoicePricePerUnit
        ) {
          // Restaurăm datele originale
          item.quantity = item.originalQuantity
          item.unitMeasure = item.originalUnitMeasure
          item.invoicePricePerUnit = item.originalInvoicePricePerUnit

          if (item.originalDocumentQuantity !== undefined) {
            item.documentQuantity = item.originalDocumentQuantity
            item.originalDocumentQuantity = undefined // Resetăm câmpul
          }

          // Curățăm câmpurile temporare
          item.originalQuantity = undefined
          item.originalUnitMeasure = undefined
          item.originalInvoicePricePerUnit = undefined
        }
      }

      reception.status = 'DRAFT'

      await reception.save({ session })

      if (reception.invoices && reception.invoices.length > 0) {
        for (const invoice of reception.invoices) {
          invoice.vatValue = 0
          invoice.totalWithVat = 0
        }
      }

      return {
        success: true,
        message:
          'Confirmarea revocată, mișcările de stoc inversate și prețurile restaurate.',
        data: JSON.parse(JSON.stringify(reception)),
      }
    })

    return result as ActionResultWithData<PopulatedReception>
  } finally {
    await session.endSession()
  }
}

export async function deleteReception(
  receptionId: string,
): Promise<ActionResult> {
  try {
    await connectToDatabase()

    const receptionToDelete = await ReceptionModel.findById(receptionId)

    if (!receptionToDelete) {
      return { success: false, message: 'Recepția nu a fost găsită.' }
    }

    if (receptionToDelete.status !== 'DRAFT') {
      return {
        success: false,
        message:
          'Doar recepțiile în starea "Ciornă" (Draft) pot fi șterse. Cele confirmate trebuie mai întâi revocate.',
      }
    }

    await ReceptionModel.findByIdAndDelete(receptionId)

    return { success: true, message: 'Recepția a fost ștearsă cu succes.' }
  } catch (error) {
    console.error('Eroare la ștergerea recepției:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function getAllReceptions() {
  await connectToDatabase()

  const receptions = await ReceptionModel.find({})
    .populate({ path: 'supplier', model: Supplier, select: 'name' })
    .populate({ path: 'createdBy', model: User, select: 'name' })
    .populate({
      path: 'products.product',
      model: 'ERPProduct',
      select: 'name unit packagingUnit packagingQuantity itemsPerPallet',
    })
    .populate({
      path: 'packagingItems.packaging',
      model: 'Packaging',
      select: 'name unit packagingUnit packagingQuantity',
    })
    .sort({ createdAt: -1 })
    .lean()
  return JSON.parse(JSON.stringify(receptions))
}

export async function getReceptionById(
  id: string,
): Promise<PopulatedReception | null> {
  try {
    await connectToDatabase()
    const reception = await ReceptionModel.findById(id)
      .populate({ path: 'supplier', model: Supplier, select: 'name' })
      .populate({ path: 'createdBy', model: User, select: 'name' })
      .populate({
        path: 'products.product',
        model: 'ERPProduct',
        select: 'name unit packagingUnit packagingQuantity itemsPerPallet',
      })
      .populate({
        path: 'packagingItems.packaging',
        model: 'Packaging',
        select: 'name unit packagingUnit packagingQuantity',
      })
      .lean()

    if (!reception) {
      return null
    }

    return JSON.parse(JSON.stringify(reception))
  } catch (error) {
    console.error('Eroare la preluarea recepției:', error)
    return null
  }
}

export async function getLastReceptionPriceForProduct(productId: string) {
  try {
    await connectToDatabase()

    if (!productId) {
      console.warn('ID produs lipsă la căutarea prețului.')
      return null
    }

    const latestConfirmedReception = await ReceptionModel.findOne({
      'products.product': productId,
      status: 'CONFIRMAT',
    })
      .sort({ receptionDate: -1 })
      .lean()

    if (!latestConfirmedReception) {
      return null
    }

    const receptionItem = latestConfirmedReception.products.find(
      (p) => p.product.toString() === productId,
    )

    if (!receptionItem) {
      return null
    }

    return {
      price: receptionItem.invoicePricePerUnit,
      unitMeasure: receptionItem.unitMeasure,
    }
  } catch (error) {
    console.error(
      `Eroare în getLastReceptionPriceForProduct pentru ID ${productId}:`,
      error,
    )
    return null
  }
}
export async function getLastReceptionPriceForPackaging(packagingId: string) {
  try {
    await connectToDatabase()
    const rec = await ReceptionModel.findOne({
      'packagingItems.packaging': packagingId,
      status: 'CONFIRMAT',
    })
      .sort({ receptionDate: -1 })
      .lean()

    if (!rec) return null
    const item = rec.packagingItems.find(
      (p) => p.packaging.toString() === packagingId,
    )

    if (!item) return null

    // Returnăm un obiect cu prețul ȘI unitatea de măsură
    return {
      price: item.invoicePricePerUnit,
      unitMeasure: item.unitMeasure,
    }
  } catch (err) {
    console.error(
      `Eroare în getLastReceptionPriceForPackaging pentru ID ${packagingId}:`,
      err,
    )
    return null
  }
}
