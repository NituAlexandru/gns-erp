import mongoose from 'mongoose'
import ReceptionModel, { IInvoice } from './reception.model'
import {
  recordStockMovement,
  reverseStockMovementsByReference,
} from '../inventory/inventory.actions'
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
import User from '../user/user.model'
import { distributeTransportCost } from './reception.helpers'
import {
  convertAmountToRON,
  roundToTwoDecimals,
  sumToTwoDecimals,
} from '@/lib/finance/money'

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
          const vatValue = roundToTwoDecimals(amount * (vatRate / 100))
          const totalWithVat = roundToTwoDecimals(amount + vatValue)
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
    const newReception = await ReceptionModel.create(payload)

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

    const updatedReception = await ReceptionModel.findByIdAndUpdate(
      _id,
      updateData,
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
export async function confirmReception(
  receptionId: string
): Promise<ActionResultWithData<PopulatedReception>> {
  const session = await mongoose.startSession()
  try {
    const result = await session.withTransaction(async (session) => {
      const reception = await ReceptionModel.findById(receptionId)
        .populate<{ supplier: { name: string } }>('supplier', 'name')
        .session(session)

      if (!reception) {
        throw new Error('Recepția nu a fost găsită.')
      }
      if (reception.status === 'CONFIRMAT') {
        throw new Error('Recepția este deja confirmată.')
      }

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

      const allOriginalItems = [
        ...(reception.products || []),
        ...(reception.packagingItems || []),
      ]

      const itemsWithTransportCost = distributeTransportCost(
        allOriginalItems,
        totalTransportCost
      )

      // === VALIDARE FINALIZARE (fără TVA, în RON) ===
      const merchandiseTotalRON = roundToTwoDecimals(
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

      const transportTotalRON = roundToTwoDecimals(
        (reception.deliveries || []).reduce(
          (sum, d) => sum + (d.transportCost || 0),
          0
        )
      )

      // total facturi fără TVA în RON (cu curs, dacă e cazul)
      const invoicesTotalRON = roundToTwoDecimals(
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

      const expectedNoVatRON = roundToTwoDecimals(
        merchandiseTotalRON + transportTotalRON
      )

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

        const itemType = 'product' in item ? 'Product' : 'Packaging'
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
        const invoicePricePerBaseUnit = roundToTwoDecimals(
          item.invoicePricePerUnit / conversionFactor
        )
        const totalDistributedTransport =
          transportData.totalDistributedTransportCost || 0
        const distributedTransportCostPerBaseUnit = roundToTwoDecimals(
          totalDistributedTransport / baseQuantity
        )
        const landedCostPerUnit = roundToTwoDecimals(
          invoicePricePerBaseUnit + distributedTransportCostPerBaseUnit
        )
        const vatValuePerUnit = roundToTwoDecimals(
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

        // 4. Trimitem datele CURATE și STANDARDIZATE la inventar
        await recordStockMovement(
          {
            stockableItem: itemId.toString(),
            stockableItemType: itemType,
            movementType: 'RECEPTIE',
            quantity: item.quantity, 
            locationTo: targetLocation,
            referenceId: reception._id.toString(),
            note: `Recepție ${itemType} de la furnizor ${reception.supplier.name}`,
            unitCost: item.landedCostPerUnit, 
            timestamp: reception.receptionDate,
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
