import mongoose, { Types } from 'mongoose'
import ReceptionModel, { IInvoice } from './reception.model'
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

export type ActionResultWithData<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string }

export type ActionResult =
  | { success: true; message: string }
  | { success: false; message: string }

function processReceptionInputData(
  data: ReceptionCreateInput | ReceptionUpdateInput
) {
  const processedData = { ...data }

  processedData.deliveries =
    data.deliveries?.filter((d) => d.dispatchNoteNumber?.trim() !== '') || []

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
  data: ReceptionCreateInput
): Promise<ActionResultWithData<PopulatedReception>> {
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
      productsData.map((p: IERPProductDoc) => [p._id.toString(), p])
    )
    const packagingMap = new Map(
      packagingData.map((p: IPackagingDoc) => [p._id.toString(), p])
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
        }
      }),
    }
    // --- Sfârșit logică snapshot-uri ---

    // --- AICI ERA EROAREA MEA ---
    // Folosim payload-ul îmbogățit, nu cel vechi
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
        2
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
  data: ReceptionUpdateInput
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
      productsData.map((p: IERPProductDoc) => [p._id.toString(), p])
    )
    const packagingMap = new Map(
      packagingData.map((p: IPackagingDoc) => [p._id.toString(), p])
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
        }
      }),
    }
    // --- Sfârșit logică snapshot-uri ---

    // Folosim payload-ul îmbogățit
    const updatedReception = await ReceptionModel.findByIdAndUpdate(
      _id,
      updateDataWithSnapshots,
      { new: true }
    )
    if (!updatedReception) {
      throw new Error(
        'Recepția pe care încerci să o modifici nu a fost găsită.'
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
        2
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
  const session = await mongoose.startSession()
  try {
    const result = await session.withTransaction(async (session) => {
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
        0
      )
      const productsToProcess = reception.products || [] // Pas 2: Distribuim costul total de transport PONDERAT doar pe lista de produse.

      const productsWithTransportCost = distributeTransportCost(
        productsToProcess,
        totalTransportCost
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
          0
        ) +
          (reception.packagingItems || []).reduce(
            (sum, it) =>
              sum + (it.invoicePricePerUnit ?? 0) * (it.quantity ?? 0),
            0
          )
      )

      const transportTotalRON = round2(
        (reception.deliveries || []).reduce(
          (sum, d) => sum + (d.transportCost || 0),
          0
        )
      )

      // total facturi fără TVA în RON (cu curs, dacă e cazul)
      const invoicesTotalRON = round2(
        sumToTwoDecimals(
          (reception.invoices || []).map((inv: IInvoice) =>
            convertAmountToRON(
              typeof inv.amount === 'number' ? inv.amount : 0,
              inv.currency || 'RON',
              inv.exchangeRateOnIssueDate
            )
          )
        )
      )

      // valută ≠ RON => curs obligatoriu
      for (const inv of reception.invoices || []) {
        if (inv.currency !== 'RON') {
          const fx = inv.exchangeRateOnIssueDate
          if (!fx || fx <= 0) {
            throw new Error(
              `Factura ${inv.series || ''} ${inv.number}: lipsește exchangeRateOnIssueDate pentru moneda ${inv.currency}.`
            )
          }
        }
      }

      const expectedNoVatRON = round2(merchandiseTotalRON + transportTotalRON)

      if (invoicesTotalRON !== expectedNoVatRON) {
        throw new Error(
          `Total facturi fără TVA (${invoicesTotalRON} RON) ≠ marfă + transport (${expectedNoVatRON} RON).`
        )
      }

      // === SCRIERE COSTURI & INVENTAR ===
      for (let i = 0; i < allOriginalItems.length; i++) {
        const item = allOriginalItems[i]
        const transportData = itemsWithTransportCost[i]

        if (
          item.invoicePricePerUnit === null ||
          typeof item.invoicePricePerUnit === 'undefined' ||
          item.invoicePricePerUnit < 0
        ) {
          throw new Error(
            'Prețul de factură (fără TVA) lipsește pentru cel puțin un articol.'
          )
        }

        const itemType = 'product' in item ? 'ERPProduct' : 'Packaging'
        const itemId = 'product' in item ? item.product : item.packaging
        const details = await getStockableItemDetails(
          itemId.toString(),
          itemType
        )

        // 1. Calculăm cantitatea în unitatea de BAZĂ
        let baseQuantity = 0
        let conversionFactor = 1
        switch (item.unitMeasure) {
          case details.unit:
            baseQuantity = item.quantity
            conversionFactor = 1
            break
          case details.packagingUnit:
            if (!details.packagingQuantity || details.packagingQuantity <= 0)
              throw new Error(
                `Factor de conversie 'packagingQuantity' invalid pentru ${itemId}.`
              )
            baseQuantity = item.quantity * details.packagingQuantity
            conversionFactor = details.packagingQuantity
            break
          case 'palet':
            if (!details.itemsPerPallet || details.itemsPerPallet <= 0)
              throw new Error(
                `Factor de conversie 'itemsPerPallet' invalid pentru ${itemId}.`
              )
            const totalBaseUnitsPerPallet = details.packagingQuantity
              ? details.itemsPerPallet * details.packagingQuantity
              : details.itemsPerPallet
            if (totalBaseUnitsPerPallet <= 0)
              throw new Error(
                `Calculul unităților pe palet a eșuat pentru ${itemId}.`
              )
            baseQuantity = item.quantity * totalBaseUnitsPerPallet
            conversionFactor = totalBaseUnitsPerPallet
            break
          default:
            throw new Error(
              `Unitate de măsură '${item.unitMeasure}' invalidă pentru ${itemId}.`
            )
        }

        if (baseQuantity === 0) continue

        // 2. Calculăm TOATE costurile pe unitatea de BAZĂ
        const invoicePricePerBaseUnit = round6(
          item.invoicePricePerUnit / conversionFactor
        )
        const totalDistributedTransport =
          transportData.totalDistributedTransportCost || 0

        const distributedTransportCostPerBaseUnit = round6(
          totalDistributedTransport / baseQuantity
        )

        const landedCostPerUnit = round6(
          invoicePricePerBaseUnit + distributedTransportCostPerBaseUnit
        )
        const vatValuePerUnit = round6(
          invoicePricePerBaseUnit * (item.vatRate / 100)
        )

        // Salvăm valorile originale introduse de utilizator
        item.originalQuantity = item.quantity
        item.originalUnitMeasure = item.unitMeasure
        item.originalInvoicePricePerUnit = item.invoicePricePerUnit

        // 3. SUPRASCRIEM DATELE PE DOCUMENTUL DE RECEPȚIE CU VALORILE STANDARD
        item.quantity = baseQuantity
        item.unitMeasure = details.unit! // Forțăm unitatea de măsură de bază
        item.invoicePricePerUnit = invoicePricePerBaseUnit // Forțăm prețul pe unitatea de bază
        item.distributedTransportCostPerUnit =
          distributedTransportCostPerBaseUnit
        item.totalDistributedTransportCost = totalDistributedTransport
        item.landedCostPerUnit = landedCostPerUnit
        item.vatValuePerUnit = vatValuePerUnit

        // --- NOU: 4. Actualizăm Furnizorul Produsului (Auto-Discovery) ---
        if (itemType === 'ERPProduct') {
          const productItem = item as (typeof reception.products)[0]

          await addOrUpdateSupplierForProduct(
            itemId.toString(),
            supplierIdStr,
            item.landedCostPerUnit,
            productItem.productCode, // Aici folosim productCode
            session
          )
        } else {
          // Aici item este un ambalaj
          const packagingItem = item as (typeof reception.packagingItems)[0]

          await addOrUpdateSupplierForPackaging(
            itemId.toString(),
            supplierIdStr,
            item.landedCostPerUnit,
            packagingItem.productCode,
            session
          )
        }
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
          },
          session
        )
      }

      reception.status = 'CONFIRMAT'

      await reception.save({ session })

      return {
        success: true,
        message: 'Recepție confirmată și stoc actualizat!',
        data: JSON.parse(JSON.stringify(reception)),
      }
    })
    return result as ActionResultWithData<PopulatedReception>
  } catch (error: unknown) {
    console.error('Eroare la confirmarea recepției:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Eroare la confirmarea recepției.'
    return { success: false, message }
  } finally {
    await session.endSession()
  }
}

// TODO (Proiecte): De refactorizat când Proiectele au sub-locații.
// Logica trebuie să fie identică cu cea de la confirmReception.
export async function revokeConfirmation(
  receptionId: string
): Promise<ActionResultWithData<PopulatedReception>> {
  const session = await mongoose.startSession()
  try {
    const result = await session.withTransaction(async (session) => {
      await reverseStockMovementsByReference(receptionId, session)

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
  receptionId: string
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
  id: string
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
      (p) => p.product.toString() === productId
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
      error
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
      (p) => p.packaging.toString() === packagingId
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
      err
    )
    return null
  }
}
