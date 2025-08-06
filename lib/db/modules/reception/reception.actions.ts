import mongoose from 'mongoose'
import ReceptionModel from './reception.model'
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

export async function createReception(data: ReceptionCreateInput) {
  try {
    console.log(
      '--- 2. Action: Datele au ajuns în createReception ---',
      JSON.stringify(data, null, 2)
    )

    const cleanedData = {
      ...data,
      deliveries:
        data.deliveries?.filter(
          (d) => d.dispatchNoteNumber && d.dispatchNoteNumber.trim() !== ''
        ) || [],
      invoices:
        data.invoices?.filter(
          (inv) => inv.number && inv.number.trim() !== ''
        ) || [],
    }
    console.log(
      '--- 3. Action: Datele după curățare ---',
      JSON.stringify(cleanedData, null, 2)
    )

    const payload = ReceptionCreateSchema.parse(cleanedData)

    console.log(
      '--- 4. Action: Payload-ul final care se salvează ---',
      JSON.stringify(payload, null, 2)
    )

    const newReception = await ReceptionModel.create(payload)

    return {
      success: true,
      message: 'Recepție salvată ca ciornă.',
      data: JSON.parse(JSON.stringify(newReception)),
    }
    //eslint-disable-next-line
  } catch (error: any) {
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
    return {
      success: false,
      message: error.message || 'Eroare la crearea recepției.',
    }
  }
}

export async function updateReception(data: ReceptionUpdateInput) {
  try {
    const cleanedData = {
      ...data,
      deliveries:
        data.deliveries?.filter(
          (d) => d.dispatchNoteNumber && d.dispatchNoteNumber.trim() !== ''
        ) || [],
      invoices:
        data.invoices?.filter(
          (inv) => inv.number && inv.number.trim() !== ''
        ) || [],
    }

    const payload = ReceptionUpdateSchema.parse(cleanedData)
    const { _id, ...updateData } = payload

    const receptionToUpdate = await ReceptionModel.findById(_id)

    if (!receptionToUpdate) {
      throw new Error(
        'Recepția pe care încerci să o modifici nu a fost găsită.'
      )
    }
    // if (receptionToUpdate.status === 'CONFIRMAT') {
    //   throw new Error('O recepție confirmată nu poate fi modificată.')
    // }

    const updatedReception = await ReceptionModel.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    )

    return {
      success: true,
      message: 'Recepție actualizată cu succes.',
      data: JSON.parse(JSON.stringify(updatedReception)),
    }
    //eslint-disable-next-line
  } catch (error: any) {
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
    return {
      success: false,
      message: error.message || 'Eroare la actualizarea recepției.',
    }
  }
}

// TODO (Proiecte): De refactorizat când Proiectele au sub-locații.
// Locația ar trebui să fie o combinație, ex: `proiectId_DEPOZIT`.
export async function confirmReception(receptionId: string) {
  const session = await mongoose.startSession()
  try {
    const result = await session.withTransaction(async (session) => {
      const reception = await ReceptionModel.findById(receptionId)
        .populate<{ supplier: { name: string } }>('supplier', 'name')
        .session(session)

      if (!reception) {
        return { success: false, message: 'Recepția nu a fost găsită.' }
      }
      if (reception.status === 'CONFIRMAT') {
        return { success: false, message: 'Recepția este deja confirmată.' }
      }

      let targetLocation: string
      if (reception.destinationType === 'PROIECT') {
        if (!reception.destinationId)
          return { success: false, message: 'ID-ul de proiect lipsește.' }
        targetLocation = reception.destinationId.toString()
      } else {
        targetLocation = reception.destinationLocation
      } // --- NOUA LOGICĂ, SIMPLIFICATĂ ---
      // 1. Calculăm costul total de transport

      const totalTransportCost = reception.deliveries.reduce(
        (sum, delivery) => sum + (delivery.transportCost || 0),
        0
      ) // 2. Combinăm toate articolele într-un singur array

      const allOriginalItems = [
        ...(reception.products || []),
        ...(reception.packagingItems || []),
      ] // 3. Apelăm funcția ajutătoare. Ordinea articolelor va fi păstrată.

      const itemsWithTransportCost = distributeTransportCost(
        allOriginalItems,
        totalTransportCost
      ) // 4. Iterăm prin articole folosind indexul, NU o căutare după _id

      for (let i = 0; i < allOriginalItems.length; i++) {
        const item = allOriginalItems[i] // Articolul original
        const transportData = itemsWithTransportCost[i] // Articolul corespunzător cu costul calculat

        if (!transportData) {
          throw new Error(
            `Eroare de sincronizare a array-urilor la index ${i}.`
          )
        }

        const totalDistributedTransport =
          transportData.totalDistributedTransportCost || 0
        const itemType = 'product' in item ? 'Product' : 'Packaging'
        const itemId = 'product' in item ? item.product : item.packaging

        // ... restul logicii de calcul pentru baseQuantity, landedCost etc. ...
        // (această parte rămâne neschimbată)

        if (
          item.invoicePricePerUnit === null ||
          typeof item.invoicePricePerUnit === 'undefined' ||
          item.invoicePricePerUnit < 0
        ) {
          return {
            success: false,
            message: `Prețul de factură lipsește pentru cel puțin un articol.`,
          }
        }

        const details = await getStockableItemDetails(
          itemId.toString(),
          itemType as 'Product' | 'Packaging'
        )

        let baseQuantity = 0
        switch (item.unitMeasure) {
          case details.unit:
            baseQuantity = item.quantity
            break
          case details.packagingUnit:
            if (!details.packagingQuantity || details.packagingQuantity <= 0)
              throw new Error(
                `Factor de conversie 'packagingQuantity' invalid pentru ${itemId}.`
              )
            baseQuantity = item.quantity * details.packagingQuantity
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
            break
          default:
            throw new Error(
              `Unitate de măsură '${item.unitMeasure}' invalidă pentru ${itemId}.`
            )
        }

        if (baseQuantity === 0) continue

        const conversionFactor = baseQuantity / item.quantity
        const invoicePricePerBaseUnit =
          item.invoicePricePerUnit / conversionFactor
        const distributedTransportCostPerUnit =
          totalDistributedTransport / baseQuantity
        const landedCostPerUnit =
          invoicePricePerBaseUnit + distributedTransportCostPerUnit

        item.invoicePricePerUnit = invoicePricePerBaseUnit
        item.distributedTransportCostPerUnit = distributedTransportCostPerUnit
        item.totalDistributedTransportCost = totalDistributedTransport
        item.landedCostPerUnit = landedCostPerUnit

        await recordStockMovement({
          stockableItem: itemId.toString(),
          stockableItemType: itemType,
          movementType: 'RECEPTIE',
          quantity: baseQuantity,
          locationTo: targetLocation,
          referenceId: reception._id.toString(),
          note: `Recepție ${itemType} de la furnizor ${reception.supplier.name}`,
          unitCost: landedCostPerUnit,
          timestamp: reception.receptionDate,
        })
      }

      reception.status = 'CONFIRMAT'
      await reception.save({ session })

      return {
        success: true,
        message: 'Recepție confirmată și stoc actualizat!',
        data: JSON.parse(JSON.stringify(reception)),
      }
    })

    return result
  } catch (error) {
    console.error('Eroare la confirmarea recepției:', error)
    return { success: false, message: (error as Error).message }
  } finally {
    await session.endSession()
  }
}

// TODO (Proiecte): De refactorizat când Proiectele au sub-locații.
// Logica trebuie să fie identică cu cea de la confirmReception.
export async function revokeConfirmation(receptionId: string) {
  const session = await mongoose.startSession()
  try {
    const result = await session.withTransaction(async (session) => {
      // 1. Inversează mișcările de stoc
      await reverseStockMovementsByReference(receptionId, session)

      // 2. Încarcă recepția cu detaliile necesare
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

      // 3. Recalculăm o singură dată invoicePricePerUnit la UM-ul salvat
      reception.products.forEach((item) => {
        //eslint-disable-next-line
        const det = item.product as any
        let factor = 1
        if (item.unitMeasure === det.packagingUnit && det.packagingQuantity) {
          factor = det.packagingQuantity
        } else if (item.unitMeasure === 'palet' && det.itemsPerPallet) {
          const perPkg = det.packagingQuantity || 1
          factor = det.itemsPerPallet * perPkg
        }
        item.invoicePricePerUnit = item.invoicePricePerUnit * factor
      })
      reception.packagingItems.forEach((item) => {
        //eslint-disable-next-line
        const det = item.packaging as any
        if (item.unitMeasure === det.packagingUnit && det.packagingQuantity) {
          item.invoicePricePerUnit =
            item.invoicePricePerUnit * det.packagingQuantity
        }
      })

      // 4. Readuce statusul și salvează exact o singură dată
      reception.status = 'DRAFT'
      await reception.save({ session })

      return {
        success: true,
        message:
          'Confirmarea revocată, mișcările de stoc inversate și prețurile restaurate.',
        data: JSON.parse(JSON.stringify(reception)),
      }
    })

    return result
  } finally {
    await session.endSession()
  }
}

export async function deleteReception(receptionId: string) {
  try {
    await connectToDatabase()

    const receptionToDelete = await ReceptionModel.findById(receptionId)

    if (!receptionToDelete) {
      return { success: false, message: 'Recepția nu a fost găsită.' }
    }

    // REGULA DE BUSINESS: Permitem ștergerea doar pentru recepțiile DRAFT.
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

    return receptionItem.invoicePricePerUnit
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
    return item?.invoicePricePerUnit ?? null
  } catch (err) {
    console.error(
      `Eroare în getLastReceptionPriceForPackaging pentru ID ${packagingId}:`,
      err
    )
    return null
  }
}
