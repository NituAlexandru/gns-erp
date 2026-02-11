'use server'

import { connectToDatabase } from '@/lib/db'
import { startSession, Types, FilterQuery, PipelineStage } from 'mongoose'
import { revalidatePath } from 'next/cache'
import NirModel, { INirDoc } from './nir.model'
import ReceptionModel from '../../reception/reception.model'
import { getSetting } from '../../setting/setting.actions'
import {
  generateNextDocumentNumber,
  getActiveSeriesForDocumentType,
} from '../../numbering/numbering.actions'
import { round2, round6 } from '@/lib/utils'
import { CreateNirResult, NirDTO, NirLineDTO } from './nir.types'
import { ISeries } from '../../numbering/series.model'
import { PAGE_SIZE } from '@/lib/constants'
import { auth } from '@/auth'
import { CreateNirInput, CreateNirSchema } from './nir.validator'
import z from 'zod'
import DocumentCounter from '../../numbering/documentCounter.model'

// -------------------------------------------------------------
// HELPER: PRE-LOAD DATA FOR CREATE (Multi-Reception Logic)
// -------------------------------------------------------------
export async function loadNirDataFromReceptions(receptionIds: string[]) {
  try {
    await connectToDatabase()

    // A. SCENARIUL MANUAL (Nicio recepție selectată)
    // Returnăm un obiect gol, dar cu seria și numărul sugerat
    if (!receptionIds || receptionIds.length === 0) {
      const nextNumberData = await getNextNirNumberSuggestion()
      return {
        success: true,
        mode: 'MANUAL',
        data: {
          items: [],
          totals: {
            productsSubtotal: 0,
            productsVat: 0,
            packagingSubtotal: 0,
            packagingVat: 0,
            transportSubtotal: 0,
            transportVat: 0,
            subtotal: 0,
            vatTotal: 0,
            grandTotal: 0,
            totalEntryValue: 0,
          },
          // Sugerăm seria/numărul
          seriesName: nextNumberData?.series || '',
          nirNumber: nextNumberData?.number || '',
          nirDate: new Date(),
        },
      }
    }

    // B. SCENARIUL DIN RECEPȚII (1 sau mai multe)
    // 1. Încărcăm toate recepțiile
    const receptions: any[] = await ReceptionModel.find({
      _id: { $in: receptionIds },
    }).lean()

    if (receptions.length === 0) {
      throw new Error('Nu s-au găsit recepțiile selectate.')
    }

    // 2. Validare: Toate recepțiile trebuie să fie de la același FURNIZOR
    const firstSupplierId = receptions[0].supplier.toString()
    const differentSupplier = receptions.find(
      (r) => r.supplier.toString() !== firstSupplierId,
    )

    if (differentSupplier) {
      throw new Error(
        'Toate recepțiile selectate trebuie să aparțină aceluiași furnizor!',
      )
    }

    // 3. Agregare Date
    const nirItems: any[] = []
    const invoices: any[] = []
    const deliveries: any[] = []

    let productsSubtotal = 0
    let productsVat = 0
    let packagingSubtotal = 0
    let packagingVat = 0

    // Transportul pe NIR va fi strict cel de pe facturi (dacă există logică separată),
    // nu cel distribuit. Momentan îl inițializăm cu 0.
    const transportSubtotal = 0
    const transportVat = 0

    // Iterăm prin fiecare recepție
    for (const reception of receptions) {
      // a. Colectăm documentele suport (Facturi/Avize)
      if (reception.invoices) invoices.push(...reception.invoices)
      if (reception.deliveries) deliveries.push(...reception.deliveries)

      // b. Procesăm Produsele (folosind logica "Original Data")
      if (reception.products) {
        for (const item of reception.products) {
          // Validare date originale
          if (
            item.originalDocumentQuantity == null ||
            !item.originalUnitMeasure ||
            item.originalInvoicePricePerUnit == null
          ) {
            throw new Error(
              `Recepția ${reception._id} conține produse fără date originale (Cantitate/Preț document).`,
            )
          }

          const nirQty = item.originalDocumentQuantity
          const nirPrice = round6(item.originalInvoicePricePerUnit)
          const vatRate = item.vatRate || 0

          // Calcule
          const lineNet = round2(nirQty * nirPrice)
          const lineVat = round2(lineNet * (vatRate / 100))
          const lineTotal = round2(lineNet + lineVat)

          productsSubtotal += lineNet
          productsVat += lineVat

          nirItems.push({
            receptionLineId: item._id.toString(), // Legătură opțională
            stockableItemType: 'ERPProduct',
            productId: item.product?._id || item.product,
            productName: item.productName,
            productCode: item.productCode,

            unitMeasure: item.originalUnitMeasure,
            documentQuantity: nirQty,
            quantity: nirQty,
            quantityDifference: 0,

            invoicePricePerUnit: nirPrice,
            vatRate: vatRate,

            distributedTransportCostPerUnit: 0, // Zero pe NIR
            landedCostPerUnit: nirPrice, // Egal cu prețul de factură

            lineValue: lineNet,
            lineVatValue: lineVat,
            lineTotal: lineTotal,
            qualityDetails: item.qualityDetails,
          })
        }
      }

      // c. Procesăm Ambalajele
      if (reception.packagingItems) {
        for (const item of reception.packagingItems) {
          if (
            item.originalDocumentQuantity == null ||
            !item.originalUnitMeasure ||
            item.originalInvoicePricePerUnit == null
          ) {
            throw new Error(
              `Recepția ${reception._id} conține ambalaje fără date originale.`,
            )
          }

          const nirQty = item.originalDocumentQuantity
          const nirPrice = round6(item.originalInvoicePricePerUnit)
          const vatRate = item.vatRate || 0

          const lineNet = round2(nirQty * nirPrice)
          const lineVat = round2(lineNet * (vatRate / 100))
          const lineTotal = round2(lineNet + lineVat)

          packagingSubtotal += lineNet
          packagingVat += lineVat

          nirItems.push({
            receptionLineId: item._id.toString(),
            stockableItemType: 'Packaging',
            packagingId: item.packaging?._id || item.packaging,
            productName: item.packagingName,
            productCode: item.productCode,

            unitMeasure: item.originalUnitMeasure,
            documentQuantity: nirQty,
            quantity: nirQty,
            quantityDifference: 0,

            invoicePricePerUnit: nirPrice,
            vatRate: vatRate,

            distributedTransportCostPerUnit: 0,
            landedCostPerUnit: nirPrice,

            lineValue: lineNet,
            lineVatValue: lineVat,
            lineTotal: lineTotal,
            qualityDetails: item.qualityDetails,
          })
        }
      }
    }

    // 4. Calcul Totaluri Agregate
    const subtotal = round2(
      productsSubtotal + packagingSubtotal + transportSubtotal,
    )
    const vatTotal = round2(productsVat + packagingVat + transportVat)
    const grandTotal = round2(subtotal + vatTotal)

    // 5. Sugerare Număr NIR
    const nextNumberData = await getNextNirNumberSuggestion()

    // 6. Construim obiectul final (Pre-filled Form Data)
    const initialData = {
      receptionId: receptionIds, // Array-ul de ID-uri
      supplierId: receptions[0].supplier,
      supplierSnapshot: receptions[0].supplierSnapshot, // Luăm snapshot de la prima recepție
      companySnapshot: {}, // Va fi populat la save sau în frontend dacă e nevoie

      invoices: invoices,
      deliveries: deliveries,

      items: nirItems,

      totals: {
        productsSubtotal: round2(productsSubtotal),
        productsVat: round2(productsVat),
        packagingSubtotal: round2(packagingSubtotal),
        packagingVat: round2(packagingVat),
        transportSubtotal: round2(transportSubtotal),
        transportVat: round2(transportVat),
        subtotal,
        vatTotal,
        grandTotal,
        totalEntryValue: subtotal,
      },

      destinationLocation: receptions[0].destinationLocation, // Presupunem că merg în aceeași gestiune

      // Date sugerate pentru Header
      seriesName: nextNumberData?.series || '',
      nirNumber: nextNumberData?.number || '',
      nirDate: new Date(), // Data de azi default
    }

    return {
      success: true,
      mode: 'FROM_RECEPTION',
      data: JSON.parse(JSON.stringify(initialData)),
    }
  } catch (error: any) {
    console.error('Error loading NIR data:', error)
    return { success: false, message: error.message }
  }
}

// Helper intern pentru a obține următorul număr (pentru UI)
async function getNextNirNumberSuggestion() {
  try {
    const seriesList = await getActiveSeriesForDocumentType('NIR' as any)
    if (seriesList.length === 1) {
      const nextNum = seriesList[0].currentNumber + 1
      return {
        series: seriesList[0].name,
        number: String(nextNum).padStart(5, '0'),
      }
    }
    // Dacă sunt mai multe serii sau niciuna, nu putem sugera automat
    return null
  } catch (e) {
    return null
  }
}

// -------------------------------------------------------------
// 1. CREATE NIR FROM RECEPTION
// -------------------------------------------------------------
export async function createNirFromReception({
  receptionId,
  userId,
  userName,
  seriesName,
}: {
  receptionId: string
  userId: string
  userName: string
  seriesName?: string
}): Promise<CreateNirResult> {
  try {
    await connectToDatabase()

    let activeSeries = seriesName

    // 1. Verificare Serie (Exact ca la DeliveryNote)
    if (!activeSeries) {
      const documentType = 'NIR' as any
      const seriesList = await getActiveSeriesForDocumentType(documentType)

      if (seriesList.length === 0) {
        throw new Error(
          'Nu există nicio serie activă pentru documente de tip NIR.',
        )
      }

      if (seriesList.length === 1) {
        activeSeries = seriesList[0].name
      } else {
        const seriesNames = seriesList.map((s: ISeries) => s.name)
        return {
          success: false,
          requireSelection: true,
          message: `Există mai multe serii active. Selectați una.`,
          series: seriesNames,
        }
      }
    }

    // 2. Start Tranzacție
    const session = await startSession()

    const createdNir = await session.withTransaction(async (session) => {
      // a. Citim Recepția
      const reception: any =
        await ReceptionModel.findById(receptionId).session(session)
      if (!reception) throw new Error('Recepția nu a fost găsită.')
      if (reception.nirId)
        throw new Error(`Există deja un NIR generat pentru această recepție.`)

      // b. Procesăm Liniile (Cu separare Products vs Packaging)
      const nirItems: NirLineDTO[] = []

      // Accumulators
      let productsSubtotal = 0
      let productsVat = 0

      let packagingSubtotal = 0
      let packagingVat = 0

      const transportSubtotal = 0
      const transportVat = 0

      // --- LOGICA PENTRU PRODUSE ---
      if (reception.products && reception.products.length > 0) {
        for (const item of reception.products) {
          // 1. Validare Strictă: Verificăm existența datelor originale
          if (
            item.originalDocumentQuantity == null ||
            !item.originalUnitMeasure ||
            item.originalInvoicePricePerUnit == null
          ) {
            throw new Error(
              `Produsul "${item.productName}" nu are datele originale complete (Cantitate document, UM, Preț) în recepție. Verifică dacă recepția a fost salvată corect.`,
            )
          }

          // 2. Preluare date originale (Factură)
          const nirQty = item.originalDocumentQuantity
          const nirUm = item.originalUnitMeasure
          const nirPrice = round6(item.originalInvoicePricePerUnit) // Prețul de pe factură
          const vatRate = item.vatRate || 0

          // 3. Calcule Valori (Fără transport distribuit)
          const lineNet = round2(nirQty * nirPrice)
          const lineVat = round2(lineNet * (vatRate / 100))
          const lineTotal = round2(lineNet + lineVat)

          // NOTĂ: Pe NIR, prețul de intrare este strict cel de pe factură.
          // Transportul distribuit rămâne doar în Recepție/Inventar pentru costul mediu ponderat.
          const landedCost = nirPrice
          const distTranspUnit = 0

          // 4. Actualizare Totaluri NIR
          productsSubtotal += lineNet
          productsVat += lineVat
          // NU mai adăugăm nimic la transportSubtotal aici

          // ID ca ObjectId
          const pId =
            item.product && (item.product._id || item.product)
              ? new Types.ObjectId(
                  (item.product._id || item.product).toString(),
                )
              : undefined

          nirItems.push({
            receptionLineId: item._id,
            stockableItemType: 'ERPProduct',
            productId: pId,
            productName: item.productName,
            productCode: item.productCode || '',

            // --- FOLOSIM DATELE ORIGINALE ---
            unitMeasure: nirUm,
            documentQuantity: nirQty, // Cantitatea de pe document
            quantity: nirQty, // Pe NIR, cantitatea "recepționată" este cea de pe document (scriptic)

            // Cantitatea Diferență pe NIR este irelevantă față de conversie,
            // dar o putem seta 0 sau null, deoarece NIR-ul atestă documentul.
            quantityDifference: 0,

            invoicePricePerUnit: nirPrice,
            vatRate: vatRate,

            // Fără transport distribuit pe linia de NIR
            distributedTransportCostPerUnit: 0,
            landedCostPerUnit: landedCost,

            lineValue: lineNet,
            lineVatValue: lineVat,
            lineTotal: lineTotal,
            qualityDetails: item.qualityDetails,
          })
        }
      }

      // --- LOGICA PENTRU AMBALAJE ---

      if (reception.packagingItems && reception.packagingItems.length > 0) {
        for (const item of reception.packagingItems) {
          // 1. Validare Strictă
          if (
            item.originalDocumentQuantity == null ||
            !item.originalUnitMeasure ||
            item.originalInvoicePricePerUnit == null
          ) {
            throw new Error(
              `Ambalajul "${item.packagingName}" nu are datele originale complete în recepție.`,
            )
          }

          // 2. Preluare date originale
          const nirQty = item.originalDocumentQuantity
          const nirUm = item.originalUnitMeasure
          const nirPrice = round6(item.originalInvoicePricePerUnit)
          const vatRate = item.vatRate || 0

          // 3. Calcule
          const lineNet = round2(nirQty * nirPrice)
          const lineVat = round2(lineNet * (vatRate / 100))
          const lineTotal = round2(lineNet + lineVat)

          const landedCost = nirPrice

          // 4. Actualizare Totaluri
          packagingSubtotal += lineNet
          packagingVat += lineVat
          // Fără transport

          const packId =
            item.packaging && (item.packaging._id || item.packaging)
              ? new Types.ObjectId(
                  (item.packaging._id || item.packaging).toString(),
                )
              : undefined

          nirItems.push({
            receptionLineId: item._id,
            stockableItemType: 'Packaging',
            packagingId: packId,
            productName: item.packagingName,
            productCode: item.productCode || '',

            // --- DATE ORIGINALE ---
            unitMeasure: nirUm,
            documentQuantity: nirQty,
            quantity: nirQty,
            quantityDifference: 0,

            invoicePricePerUnit: nirPrice,
            vatRate: vatRate,

            distributedTransportCostPerUnit: 0,
            landedCostPerUnit: landedCost,

            lineValue: lineNet,
            lineVatValue: lineVat,
            lineTotal: lineTotal,
            qualityDetails: item.qualityDetails,
          })
        }
      }

      // 1. Subtotal (Valoarea Netă a Facturii: Marfă + Ambalaj + Transport)
      const subtotal = round2(
        productsSubtotal + packagingSubtotal + transportSubtotal,
      )
      // 2. TVA Total (TVA Marfă + TVA Ambalaj + TVA Transport)
      const vatTotal = round2(productsVat + packagingVat + transportVat)
      // 3. Grand Total (Valoarea de plată către furnizor)
      const grandTotal = round2(subtotal + vatTotal)
      // 4. Total Entry Value (Valoarea intrării în gestiune = Cost de achiziție FĂRĂ TVA)
      // Include prețul produselor și transportul repartizat.
      const totalEntryValue = subtotal
      // c. Snapshots
      const settings: any = await getSetting()
      if (!settings) throw new Error('Setările companiei nu sunt configurate.')

      const companySnapshot = {
        name: settings.name,
        cui: settings.cui,
        regCom: settings.regCom,
        address: settings.address,
        bankAccounts: settings.bankAccounts,
        capitalSocial: settings.capitalSocial,
        phones: settings.phones,
        emails: settings.emails,
      }

      const supplierSnapshot = {
        name: reception.supplierSnapshot?.name || '',
        cui: reception.supplierSnapshot?.cui || '',
      }

      // d. Generare Număr
      const year = new Date().getFullYear()
      const nextSeq = await generateNextDocumentNumber(activeSeries!, {
        session,
      })
      const paddedNum = String(nextSeq).padStart(5, '0')

      // e. Creare NIR
      const [newNir] = await NirModel.create(
        [
          {
            nirNumber: paddedNum,
            seriesName: activeSeries,
            sequenceNumber: nextSeq,
            year: year,
            nirDate: new Date(),
            receptionId: reception._id,
            supplierId: reception.supplier,
            destinationLocation: reception.destinationLocation,
            orderRef: reception.orderRef || null,
            invoices: reception.invoices || [],
            deliveries: reception.deliveries || [],
            companySnapshot,
            supplierSnapshot,
            receivedBy: { userId: new Types.ObjectId(userId), name: userName },
            items: nirItems,
            totals: {
              productsSubtotal: round2(productsSubtotal),
              productsVat: round2(productsVat),
              packagingSubtotal: round2(packagingSubtotal),
              packagingVat: round2(packagingVat),
              transportSubtotal: round2(transportSubtotal),
              transportVat: round2(transportVat),
              subtotal: subtotal,
              vatTotal: vatTotal,
              grandTotal: grandTotal,
              totalEntryValue: totalEntryValue,
            },
            status: 'CONFIRMED',
          },
        ],
        { session },
      )

      // f. Update Recepție
      await ReceptionModel.findByIdAndUpdate(
        reception._id,
        {
          nirId: newNir._id,
          nirNumber: `${activeSeries}-${paddedNum}`,
          nirDate: newNir.nirDate,
        },
        { session },
      )

      return JSON.parse(JSON.stringify(newNir)) as NirDTO
    })

    await session.endSession()

    if (createdNir) {
      revalidatePath('/financial/nir')
      return { success: true, data: createdNir }
    } else {
      return { success: false, message: 'Eroare necunoscută la crearea NIR.' }
    }
  } catch (error) {
    console.error('❌ Eroare createNirFromReception:', error)
    return { success: false, message: (error as Error).message }
  }
}

// -------------------------------------------------------------
// 2. CANCEL NIR
// -------------------------------------------------------------
export async function cancelNir({
  nirId,
  reason,
  userId,
  userName,
}: {
  nirId: string
  reason: string
  userId: string
  userName: string
}): Promise<{ success: boolean; message: string }> {
  if (!reason || reason.trim().length < 5) {
    return {
      success: false,
      message: 'Motivul anulării este obligatoriu (min. 5 caractere).',
    }
  }

  const session = await startSession()

  try {
    await session.withTransaction(async (session) => {
      const nir = await NirModel.findById(nirId).session(session)
      if (!nir) throw new Error('NIR-ul nu a fost găsit.')
      if (nir.status === 'CANCELLED')
        throw new Error('NIR-ul este deja anulat.')

      // Update NIR
      nir.status = 'CANCELLED'
      nir.cancellationReason = reason
      nir.cancelledAt = new Date()
      nir.cancelledBy = new Types.ObjectId(userId)
      nir.cancelledByName = userName
      await nir.save({ session })
    })

    await session.endSession()
    revalidatePath('/financial/nir')
    return { success: true, message: 'NIR anulat cu succes.' }
  } catch (error) {
    await session.endSession()
    console.error('❌ Eroare cancelNir:', error)
    return { success: false, message: (error as Error).message }
  }
}

// -------------------------------------------------------------
// 3. GET BY ID
// -------------------------------------------------------------
export async function getNirById(id: string) {
  try {
    await connectToDatabase()
    const nir = await NirModel.findById(id).lean()
    if (!nir) return { success: false, message: 'NIR negăsit' }
    return { success: true, data: JSON.parse(JSON.stringify(nir)) as NirDTO }
  } catch (error) {
    console.error('Error getNirById:', error)
    return { success: false, message: 'Eroare server' }
  }
}

// -------------------------------------------------------------
// 4. GET BY RECEPTION ID
// -------------------------------------------------------------
export async function getNirByReceptionId(receptionId: string) {
  try {
    await connectToDatabase()
    const nir = await NirModel.findOne({ receptionId }).lean()
    if (!nir) return null
    return JSON.parse(JSON.stringify(nir)) as NirDTO
  } catch (error) {
    console.error('Error getNirByReceptionId:', error)
    return null
  }
}

// -------------------------------------------------------------
// 5. GET LIST (FILTER / PAGINATION)
// -------------------------------------------------------------
export async function getNirs(
  page: number = 1,
  filters: {
    status?: string
    supplierId?: string
    q?: string
    startDate?: string
    endDate?: string
  } = {},
): Promise<{ data: NirDTO[]; totalPages: number; totalSum: number }> {
  try {
    await connectToDatabase()
    const { status, supplierId, q, startDate, endDate } = filters
    const skip = (page - 1) * PAGE_SIZE

    const pipeline: PipelineStage[] = []

    // 1. Match (Filtrare)
    const matchStage: FilterQuery<INirDoc> = {}

    if (status && status !== 'ALL') {
      matchStage.status = status
    }

    if (supplierId) {
      matchStage.supplierId = new Types.ObjectId(supplierId)
    }

    if (q) {
      const regex = new RegExp(q, 'i')
      matchStage.$or = [
        { nirNumber: regex },
        { 'supplierSnapshot.name': regex },
      ]
    }

    // Filtrare Dată
    if (startDate || endDate) {
      matchStage.nirDate = {}
      if (startDate) matchStage.nirDate.$gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        matchStage.nirDate.$lte = end
      }
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage })
    }

    // 2. Facet (Date + Totaluri)
    pipeline.push({
      $facet: {
        data: [
          { $sort: { nirDate: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: PAGE_SIZE },
        ],
        stats: [
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalSum: { $sum: '$totals.grandTotal' }, // Calculăm suma totală
            },
          },
        ],
      },
    })

    const result = await NirModel.aggregate(pipeline)
    const data = result[0].data || []
    const stats = result[0].stats[0] || { count: 0, totalSum: 0 }

    return {
      data: JSON.parse(JSON.stringify(data)),
      totalPages: Math.ceil(stats.count / PAGE_SIZE),
      totalSum: stats.totalSum, // Returnăm suma
    }
  } catch (error) {
    console.error('Error getNirs:', error)
    return { data: [], totalPages: 0, totalSum: 0 }
  }
}

// -------------------------------------------------------------
// 6. ACTION WRAPPER (Pentru butonul din UI)
// -------------------------------------------------------------
export async function generateNirForReceptionAction(
  receptionId: string,
  seriesName?: string,
) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error('Nu ești autentificat.')

    const result = await createNirFromReception({
      receptionId,
      userId: session.user.id!,
      userName: session.user.name!,
      seriesName,
    })

    if (!result.success && result.requireSelection) {
      return result
    }

    if (result.success) {
      revalidatePath('/admin/management/reception')
    }

    return result
  } catch (error) {
    console.error('Error generateNirForReceptionAction:', error)
    return { success: false, message: (error as Error).message }
  }
}

// -------------------------------------------------------------
// 7. UPDATE NIR (Decuplat de Stoc/Recepție)
// -------------------------------------------------------------

export async function updateNir({
  nirId,
  data,
  userId,
  userName,
}: {
  nirId: string
  data: CreateNirInput
  userId: string
  userName: string
}): Promise<{ success: boolean; message: string }> {
  try {
    await connectToDatabase()

    // 1. Validăm payload-ul (totaluri, structură)
    const payload = CreateNirSchema.parse(data)

    // 2. Verificăm existența și statusul
    const existingNir = await NirModel.findById(nirId)
    if (!existingNir) {
      throw new Error('NIR-ul nu a fost găsit.')
    }

    if (existingNir.status === 'CANCELLED') {
      throw new Error('Nu poți modifica un NIR anulat.')
    }

    // 3. Pregătim datele pentru update
    // Păstrăm identitatea documentului (Număr, Serie) intactă din baza de date
    const updatePayload = {
      ...payload,
      nirNumber: payload.nirNumber || existingNir.nirNumber,
      seriesName: payload.seriesName || existingNir.seriesName,
      sequenceNumber: existingNir.sequenceNumber,
      year: new Date(payload.nirDate!).getFullYear(),
      updatedAt: new Date(),
    }

    // 4. Executăm Update-ul și SALVĂM REZULTATUL în 'updatedNir'
    const updatedNir = await NirModel.findByIdAndUpdate(nirId, updatePayload, {
      new: true,
      runValidators: true,
    })

    // 5. ACTUALIZARE RECEPȚII
    if (
      updatedNir &&
      updatedNir.receptionId &&
      updatedNir.receptionId.length > 0
    ) {
      await ReceptionModel.updateMany(
        { _id: { $in: updatedNir.receptionId } },
        {
          $set: {
            // Actualizăm referința vizuală în recepție
            nirNumber: `${updatedNir.seriesName} ${updatedNir.nirNumber}`,
            nirDate: updatedNir.nirDate,
          },
        },
      )
    }

    revalidatePath('/financial/nir')
    revalidatePath(`/financial/nir/${nirId}`)
    revalidatePath('/admin/management/reception')
    
    return { success: true, message: 'NIR actualizat cu succes.' }
  } catch (error) {
    console.error('❌ Eroare updateNir:', error)
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Date invalide: ${JSON.stringify(error.flatten().fieldErrors)}`,
      }
    }
    return { success: false, message: (error as Error).message }
  }
}

// -------------------------------------------------------------
// 8. SYNC NIR FROM RECEPTION (Recalculează valorile)
// -------------------------------------------------------------

export async function syncNirFromReceptionAction(
  receptionId: string,
  nirId: string,
) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error('Nu ești autentificat.')

    await connectToDatabase()

    // 1. Luăm datele actuale din Recepție
    const reception: any = await ReceptionModel.findById(receptionId).lean()
    if (!reception) throw new Error('Recepția nu a fost găsită.')

    // 2. Refacem calculele (LOGICĂ ACTUALIZATĂ - DATE ORIGINALE)
    const nirItems: NirLineDTO[] = []

    let productsSubtotal = 0
    let productsVat = 0
    let packagingSubtotal = 0
    let packagingVat = 0

    // Transportul distribuit este 0 pe NIR
    const transportSubtotal = 0
    const transportVat = 0

    // --- PRODUSE ---
    if (reception.products && reception.products.length > 0) {
      for (const item of reception.products) {
        // Validare
        if (
          item.originalDocumentQuantity == null ||
          !item.originalUnitMeasure ||
          item.originalInvoicePricePerUnit == null
        ) {
          throw new Error(
            `Produsul "${item.productName}" nu are datele originale complete.`,
          )
        }

        const nirQty = item.originalDocumentQuantity
        const nirUm = item.originalUnitMeasure
        const nirPrice = round6(item.originalInvoicePricePerUnit)
        const vatRate = item.vatRate || 0

        const lineNet = round2(nirQty * nirPrice)
        const lineVat = round2(lineNet * (vatRate / 100))
        const lineTotal = round2(lineNet + lineVat)

        // Pe NIR, landedCost este prețul de factură (fără transport distribuit)
        const landedCost = nirPrice

        productsSubtotal += lineNet
        productsVat += lineVat

        const pId =
          item.product && (item.product._id || item.product)
            ? new Types.ObjectId((item.product._id || item.product).toString())
            : undefined

        nirItems.push({
          receptionLineId: item._id,
          stockableItemType: 'ERPProduct',
          productId: pId,
          productName: item.productName,
          productCode: item.productCode || '',

          // Date originale
          unitMeasure: nirUm,
          documentQuantity: nirQty,
          quantity: nirQty,
          quantityDifference: 0,

          invoicePricePerUnit: nirPrice,
          vatRate: vatRate,

          distributedTransportCostPerUnit: 0,
          landedCostPerUnit: landedCost,

          lineValue: lineNet,
          lineVatValue: lineVat,
          lineTotal: lineTotal,
          qualityDetails: item.qualityDetails,
        })
      }
    }

    // --- AMBALAJE ---
    if (reception.packagingItems && reception.packagingItems.length > 0) {
      for (const item of reception.packagingItems) {
        // Validare
        if (
          item.originalDocumentQuantity == null ||
          !item.originalUnitMeasure ||
          item.originalInvoicePricePerUnit == null
        ) {
          throw new Error(
            `Ambalajul "${item.packagingName}" nu are datele originale complete.`,
          )
        }

        const nirQty = item.originalDocumentQuantity
        const nirUm = item.originalUnitMeasure
        const nirPrice = round6(item.originalInvoicePricePerUnit)
        const vatRate = item.vatRate || 0

        const lineNet = round2(nirQty * nirPrice)
        const lineVat = round2(lineNet * (vatRate / 100))
        const lineTotal = round2(lineNet + lineVat)
        const landedCost = nirPrice

        packagingSubtotal += lineNet
        packagingVat += lineVat

        const packId =
          item.packaging && (item.packaging._id || item.packaging)
            ? new Types.ObjectId(
                (item.packaging._id || item.packaging).toString(),
              )
            : undefined

        nirItems.push({
          receptionLineId: item._id,
          stockableItemType: 'Packaging',
          packagingId: packId,
          productName: item.packagingName,
          productCode: item.productCode || '',

          // Date originale
          unitMeasure: nirUm,
          documentQuantity: nirQty,
          quantity: nirQty,
          quantityDifference: 0,

          invoicePricePerUnit: nirPrice,
          vatRate: vatRate,

          distributedTransportCostPerUnit: 0,
          landedCostPerUnit: landedCost,

          lineValue: lineNet,
          lineVatValue: lineVat,
          lineTotal: lineTotal,
          qualityDetails: item.qualityDetails,
        })
      }
    }

    const subtotal = round2(
      productsSubtotal + packagingSubtotal + transportSubtotal,
    )
    const vatTotal = round2(productsVat + packagingVat + transportVat)
    const grandTotal = round2(subtotal + vatTotal)
    const totalEntryValue = subtotal

    // 3. Update NIR
    await NirModel.findByIdAndUpdate(nirId, {
      items: nirItems,
      totals: {
        productsSubtotal: round2(productsSubtotal),
        productsVat: round2(productsVat),
        packagingSubtotal: round2(packagingSubtotal),
        packagingVat: round2(packagingVat),
        transportSubtotal: round2(transportSubtotal),
        transportVat: round2(transportVat),
        subtotal: subtotal,
        vatTotal: vatTotal,
        grandTotal: grandTotal,
        totalEntryValue: totalEntryValue,
      },
      updatedAt: new Date(),
    })

    revalidatePath('/financial/nir')
    revalidatePath(`/admin/management/reception`)
    return {
      success: true,
      message: 'NIR actualizat cu datele originale din recepție.',
    }
  } catch (error) {
    console.error('Error syncNirFromReceptionAction:', error)
    return { success: false, message: (error as Error).message }
  }
}

// -------------------------------------------------------------
// 9. CANCEL NIR ACTION (Wrapper pentru UI)
// -------------------------------------------------------------
export async function cancelNirAction(nirId: string) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error('Nu ești autentificat.')

    return await cancelNir({
      nirId,
      reason: 'Anulare manuală din lista de recepții',
      userId: session.user.id!,
      userName: session.user.name!,
    })
  } catch (error) {
    return { success: false, message: (error as Error).message }
  }
}

// -------------------------------------------------------------
// GET AVAILABLE RECEPTIONS (Pentru Modalul de Selecție)
// -------------------------------------------------------------
export async function getAvailableReceptions() {
  try {
    await connectToDatabase()

    const receptions = await ReceptionModel.find({
      status: 'CONFIRMAT',
      $or: [{ nirId: { $exists: false } }, { nirId: null }],
    })
      .select(
        '_id receptionDate supplierSnapshot products packagingItems deliveries invoices',
      )
      .sort({ receptionDate: -1 })
      .lean()

    // Le formatăm simplu pentru UI
    const formatted = receptions.map((r: any) => {
      const idString = r._id.toString()

      // --- CALCUL DINAMIC TOTAL (Pentru că nu e salvat în DB) ---
      let calculatedTotal = 0

      // Prioritate 1: Dacă avem facturi, totalul este suma "Total cu TVA" a facturilor
      if (r.invoices && r.invoices.length > 0) {
        calculatedTotal = r.invoices.reduce(
          (acc: number, inv: any) => acc + (inv.totalWithVat || 0),
          0,
        )
      }
      // Prioritate 2: Dacă nu avem facturi, calculăm Linii + TVA Linii + Transport
      else {
        const prodSum = (r.products || []).reduce((acc: number, p: any) => {
          const val = (p.quantity || 0) * (p.invoicePricePerUnit || 0)
          const vat = val * ((p.vatRate || 0) / 100) // Calculăm TVA
          return acc + val + vat
        }, 0)

        const packSum = (r.packagingItems || []).reduce(
          (acc: number, p: any) => {
            const val = (p.quantity || 0) * (p.invoicePricePerUnit || 0)
            const vat = val * ((p.vatRate || 0) / 100)
            return acc + val + vat
          },
          0,
        )

        const transSum = (r.deliveries || []).reduce((acc: number, d: any) => {
          const val = d.transportCost || 0
          const vat = val * ((d.transportVatRate || 0) / 100)
          return acc + val + vat
        }, 0)

        calculatedTotal = prodSum + packSum + transSum
      }

      // Formatăm lista de facturi
      const invoiceList = (r.invoices || []).map(
        (inv: any) => `${inv.series ? inv.series + ' ' : ''}${inv.number}`,
      )

      return {
        _id: idString,
        number: `${idString.substring(0, 6)}...`,
        date: r.receptionDate,
        supplierName: r.supplierSnapshot?.name || 'Necunoscut',

        // AICI PUNEM TOTALUL CALCULAT
        totalValue: calculatedTotal,

        itemsCount: (r.products?.length || 0) + (r.packagingItems?.length || 0),
        invoices: invoiceList,
      }
    })

    return { success: true, data: formatted }
  } catch (error: any) {
    console.error('Error fetching available receptions:', error)
    return { success: false, message: error.message }
  }
}

// -------------------------------------------------------------
// CREATE NIR (Generic - Manual sau din Recepții)
// -------------------------------------------------------------
export async function createNir(
  data: CreateNirInput & { userId: string; userName: string },
) {
  try {
    await connectToDatabase()

    // 1. Validare
    const payload = CreateNirSchema.parse(data)

    // 2. Extragere Date Header
    const finalNumber = payload.nirNumber
    const finalSeries = payload.seriesName
    let sequence = 0

    // Dacă nu are număr, aruncăm eroare (ar trebui să vină din formular)
    if (!finalNumber) {
      throw new Error('Numărul NIR este obligatoriu.')
    }

    // Extragem secvența numerică (ex: "0055" -> 55)
    sequence = parseInt(finalNumber.replace(/\D/g, '')) || 0
    const year = new Date(payload.nirDate!).getFullYear()

    const session = await startSession()

    const newNir = await session.withTransaction(async (session) => {
      // A. Creăm NIR-ul
      const [created] = await NirModel.create(
        [
          {
            ...payload,
            // Asigurăm maparea corectă a array-ului de recepții
            receptionIds: payload.receptionId,
            nirNumber: finalNumber,
            sequenceNumber: sequence,
            year: year,
            status: 'CONFIRMED',
            receivedBy: {
              userId: payload.receivedBy.userId,
              name: payload.receivedBy.name,
            },
          },
        ],
        { session },
      )

      // B. Actualizăm Recepțiile (le legăm de acest NIR)
      if (payload.receptionId && payload.receptionId.length > 0) {
        await ReceptionModel.updateMany(
          { _id: { $in: payload.receptionId } },
          {
            $set: {
              nirId: created._id,
              nirNumber: `${finalSeries} ${finalNumber}`,
              nirDate: created.nirDate,
            },
          },
          { session },
        )
      }

      // C. Actualizăm Contorul (DocumentCounter)
      // Folosim $max pentru a ne asigura că setăm contorul la valoarea curentă
      // doar dacă aceasta este mai mare decât ce era înainte.
      if (finalSeries) {
        await DocumentCounter.findOneAndUpdate(
          {
            seriesName: finalSeries,
            year: year,
            documentType: 'NIR',
          },
          {
            // Setăm contorul la numărul curent folosit (ex: 55),
            // astfel următorul generateNext va da 56.
            $max: { currentNumber: sequence },
          },
          { session, upsert: true, new: true },
        )
      }

      return created
    })

    await session.endSession()
    revalidatePath('/admin/management/reception/nir')

    return { success: true, data: JSON.parse(JSON.stringify(newNir)) }
  } catch (error: any) {
    console.error('Error creating NIR:', error)
    return { success: false, message: error.message }
  }
}
