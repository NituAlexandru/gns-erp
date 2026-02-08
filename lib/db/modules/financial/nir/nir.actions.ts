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

      let transportSubtotal = 0
      let transportVat = 0

      // --- LOGICA PENTRU PRODUSE ---
      if (reception.products && reception.products.length > 0) {
        for (const item of reception.products) {
          const qtyDoc = item.documentQuantity || item.quantity
          const qtyRec = item.quantity
          const qtyDiff = round6(qtyRec - qtyDoc)

          const invoicePrice = round6(item.invoicePricePerUnit || 0)
          const vatRate = item.vatRate || 0

          // Calcul Valoare Linie (Net Factură)
          const lineNet = round2(qtyRec * invoicePrice)
          const lineVat = round2(lineNet * (vatRate / 100))
          const lineTotal = round2(lineNet + lineVat)

          // Calcul Transport
          const landedCost = item.landedCostPerUnit || invoicePrice
          const distTranspUnit = round6(landedCost - invoicePrice)
          const lineTranspVal = round2(qtyRec * distTranspUnit)

          // Calculăm TVA Transport (dacă transportul e purtător de TVA în recepție)
          const lineTranspVat = round2(lineTranspVal * (vatRate / 100))
          transportSubtotal += lineTranspVal
          transportVat += lineTranspVat
          productsSubtotal += lineNet
          productsVat += lineVat

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
            unitMeasure: item.unitMeasure,
            documentQuantity: qtyDoc,
            quantity: qtyRec,
            quantityDifference: qtyDiff,
            invoicePricePerUnit: invoicePrice,
            vatRate: vatRate,
            distributedTransportCostPerUnit: distTranspUnit,
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
          const qtyDoc = item.documentQuantity || item.quantity
          const qtyRec = item.quantity
          const qtyDiff = round6(qtyRec - qtyDoc)

          const invoicePrice = round6(item.invoicePricePerUnit || 0)
          const vatRate = item.vatRate || 0

          // Calcule
          const lineNet = round2(qtyRec * invoicePrice)
          const lineVat = round2(lineNet * (vatRate / 100))
          const lineTotal = round2(lineNet + lineVat)

          // Transport (de obicei 0 la ambalaje, dar calculăm oricum)
          const landedCost = item.landedCostPerUnit || invoicePrice
          const distTranspUnit = round6(landedCost - invoicePrice)
          const lineTranspVal = round2(qtyRec * distTranspUnit)

          // Calculăm TVA Transport
          const lineTranspVat = round2(lineTranspVal * (vatRate / 100))
          transportSubtotal += lineTranspVal
          transportVat += lineTranspVat

          packagingSubtotal += lineNet
          packagingVat += lineVat

          // ID ca ObjectId
          const packId =
            item.packaging && (item.packaging._id || item.packaging)
              ? new Types.ObjectId(
                  (item.packaging._id || item.packaging).toString(),
                )
              : undefined

          nirItems.push({
            receptionLineId: item._id,
            stockableItemType: 'Packaging',
            packagingId: packId, // <--- ObjectId Corect
            productName: item.packagingName,
            productCode: item.productCode || '',
            unitMeasure: item.unitMeasure,
            documentQuantity: qtyDoc,
            quantity: qtyRec,
            quantityDifference: qtyDiff,
            invoicePricePerUnit: invoicePrice,
            vatRate: vatRate,
            distributedTransportCostPerUnit: distTranspUnit,
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
      nirNumber: existingNir.nirNumber,
      seriesName: existingNir.seriesName,
      sequenceNumber: existingNir.sequenceNumber,
      year: existingNir.year,

      updatedAt: new Date(),
    }

    // 4. Executăm Update-ul DOAR pe NIR
    await NirModel.findByIdAndUpdate(nirId, updatePayload, {
      new: true,
      runValidators: true,
    })

    // Nu atingem Recepția, nu atingem Stocul.

    revalidatePath('/financial/nir')
    revalidatePath(`/financial/nir/${nirId}`)

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

    // 2. Refacem calculele (LOGICĂ COPIATĂ DIN CREATE - pentru a asigura sincronizarea perfectă)
    // --- LOGICA DE CALCUL ---
    const nirItems: NirLineDTO[] = []
    let productsSubtotal = 0
    let productsVat = 0
    let packagingSubtotal = 0
    let packagingVat = 0
    let transportSubtotal = 0
    let transportVat = 0

    // Produse
    if (reception.products && reception.products.length > 0) {
      for (const item of reception.products) {
        const qtyDoc = item.documentQuantity || item.quantity
        const qtyRec = item.quantity
        const qtyDiff = round6(qtyRec - qtyDoc)
        const invoicePrice = round6(item.invoicePricePerUnit || 0)
        const vatRate = item.vatRate || 0
        const lineNet = round2(qtyRec * invoicePrice)
        const lineVat = round2(lineNet * (vatRate / 100))
        const lineTotal = round2(lineNet + lineVat)
        const landedCost = item.landedCostPerUnit || invoicePrice
        const distTranspUnit = round6(landedCost - invoicePrice)
        const lineTranspVal = round2(qtyRec * distTranspUnit)
        const lineTranspVat = round2(lineTranspVal * (vatRate / 100))

        transportSubtotal += lineTranspVal
        transportVat += lineTranspVat
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
          unitMeasure: item.unitMeasure,
          documentQuantity: qtyDoc,
          quantity: qtyRec,
          quantityDifference: qtyDiff,
          invoicePricePerUnit: invoicePrice,
          vatRate: vatRate,
          distributedTransportCostPerUnit: distTranspUnit,
          landedCostPerUnit: landedCost,
          lineValue: lineNet,
          lineVatValue: lineVat,
          lineTotal: lineTotal,
          qualityDetails: item.qualityDetails,
        })
      }
    }

    // Ambalaje
    if (reception.packagingItems && reception.packagingItems.length > 0) {
      for (const item of reception.packagingItems) {
        const qtyDoc = item.documentQuantity || item.quantity
        const qtyRec = item.quantity
        const qtyDiff = round6(qtyRec - qtyDoc)
        const invoicePrice = round6(item.invoicePricePerUnit || 0)
        const vatRate = item.vatRate || 0
        const lineNet = round2(qtyRec * invoicePrice)
        const lineVat = round2(lineNet * (vatRate / 100))
        const lineTotal = round2(lineNet + lineVat)
        const landedCost = item.landedCostPerUnit || invoicePrice
        const distTranspUnit = round6(landedCost - invoicePrice)
        const lineTranspVal = round2(qtyRec * distTranspUnit)
        const lineTranspVat = round2(lineTranspVal * (vatRate / 100))

        transportSubtotal += lineTranspVal
        transportVat += lineTranspVat
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
          unitMeasure: item.unitMeasure,
          documentQuantity: qtyDoc,
          quantity: qtyRec,
          quantityDifference: qtyDiff,
          invoicePricePerUnit: invoicePrice,
          vatRate: vatRate,
          distributedTransportCostPerUnit: distTranspUnit,
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
    revalidatePath(`/admin/management/reception`) // Refresh la lista de receptii poate e nevoie pt totaluri
    return { success: true, message: 'NIR actualizat cu datele din recepție.' }
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
