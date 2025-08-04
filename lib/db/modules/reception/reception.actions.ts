import mongoose from 'mongoose'
import ReceptionModel from './reception.model'
import { recordStockMovement } from '../inventory/inventory.actions'
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
    const result = await session.withTransaction(async () => {
      const reception = await ReceptionModel.findById(receptionId)
        .populate<{ supplier: { name: string } }>('supplier', 'name')
        .session(session)

      // --- Verificări Globale ---
      if (!reception)
        return { success: false, message: 'Recepția nu a fost găsită.' }
      if (reception.status === 'CONFIRMAT')
        return { success: false, message: 'Recepția este deja confirmată.' }
      if (!reception.supplier)
        return {
          success: false,
          message: 'Finalizarea a eșuat: Trebuie să selectezi un furnizor.',
        }
      if (!reception.deliveries || reception.deliveries.length === 0)
        return {
          success: false,
          message: 'Finalizarea a eșuat: Trebuie să adaugi cel puțin un aviz.',
        }
      if (!reception.invoices || reception.invoices.length === 0)
        return {
          success: false,
          message:
            'Finalizarea a eșuat: Trebuie să adaugi cel puțin o factură.',
        }
      const hasItems =
        (reception.products && reception.products.length > 0) ||
        (reception.packagingItems && reception.packagingItems.length > 0)
      if (!hasItems)
        return {
          success: false,
          message:
            'Finalizarea a eșuat: Recepția trebuie să conțină cel puțin un produs sau ambalaj.',
        }

      let targetLocation: string
      if (reception.destinationType === 'PROIECT') {
        if (!reception.destinationId)
          return { success: false, message: 'ID-ul de proiect lipsește.' }
        targetLocation = reception.destinationId.toString()
      } else {
        targetLocation = reception.destinationLocation
      }

      // === PROCESARE PRODUSE ===
      for (const item of reception.products) {
        if (
          item.priceAtReception === null ||
          typeof item.priceAtReception === 'undefined' ||
          item.priceAtReception < 0
        ) {
          return {
            success: false,
            message:
              'Finalizarea a eșuat: Prețul de recepție lipsește sau este invalid pentru cel puțin un produs.',
          }
        }

        const details = await getStockableItemDetails(
          item.product.toString(),
          'Product'
        )
        let baseQuantity = 0
        let pricePerBaseUnit = 0

        switch (item.unitMeasure) {
          case details.unit:
            baseQuantity = item.quantity
            pricePerBaseUnit = item.priceAtReception
            break
          case details.packagingUnit:
            if (!details.packagingQuantity || details.packagingQuantity <= 0)
              return {
                success: false,
                message: `Factor de conversie 'packagingQuantity' invalid pentru produsul ${item.product}.`,
              }
            baseQuantity = item.quantity * details.packagingQuantity
            pricePerBaseUnit = item.priceAtReception / details.packagingQuantity
            break
          case 'palet':
            if (!details.itemsPerPallet || details.itemsPerPallet <= 0)
              return {
                success: false,
                message: `Factor de conversie 'itemsPerPallet' invalid pentru produsul ${item.product}.`,
              }
            const totalBaseUnitsPerPallet = details.packagingQuantity
              ? details.itemsPerPallet * details.packagingQuantity
              : details.itemsPerPallet
            if (totalBaseUnitsPerPallet <= 0)
              return {
                success: false,
                message: `Calculul unităților pe palet a eșuat pentru produsul ${item.product}.`,
              }
            baseQuantity = item.quantity * totalBaseUnitsPerPallet
            pricePerBaseUnit = item.priceAtReception / totalBaseUnitsPerPallet
            break
          default:
            return {
              success: false,
              message: `Unitatea de măsură '${item.unitMeasure}' nu este validă pentru produsul ${item.product}.`,
            }
        }
        if (isNaN(pricePerBaseUnit) || !isFinite(pricePerBaseUnit))
          return {
            success: false,
            message: `Calculul prețului de bază a eșuat pentru produsul ${item.product}.`,
          }

        await recordStockMovement({
          stockableItem: item.product.toString(),
          stockableItemType: 'Product',
          movementType: 'RECEPTIE',
          quantity: baseQuantity,
          locationTo: targetLocation,
          referenceId: reception._id.toString(),
          note: `Recepție PRODUSE de la furnizor ${reception.supplier.name}`,
          unitCost: pricePerBaseUnit,
          timestamp: reception.receptionDate,
        })
      }

      // === PROCESARE AMBALAJE ===
      for (const item of reception.packagingItems) {
        if (
          item.priceAtReception === null ||
          typeof item.priceAtReception === 'undefined' ||
          item.priceAtReception < 0
        ) {
          return {
            success: false,
            message:
              'Finalizarea a eșuat: Prețul de recepție lipsește sau este invalid pentru cel puțin un ambalaj.',
          }
        }

        const details = await getStockableItemDetails(
          item.packaging.toString(),
          'Packaging'
        )
        let baseQuantity = 0
        let pricePerBaseUnit = 0

        switch (item.unitMeasure) {
          case details.unit:
            baseQuantity = item.quantity
            pricePerBaseUnit = item.priceAtReception
            break
          case details.packagingUnit:
            if (!details.packagingQuantity || details.packagingQuantity <= 0)
              return {
                success: false,
                message: `Factor de conversie 'packagingQuantity' invalid pentru ambalajul ${item.packaging}.`,
              }
            baseQuantity = item.quantity * details.packagingQuantity
            pricePerBaseUnit = item.priceAtReception / details.packagingQuantity
            break
          default:
            return {
              success: false,
              message: `Unitatea de măsură '${item.unitMeasure}' nu este validă pentru ambalajul ${item.packaging}.`,
            }
        }
        if (isNaN(pricePerBaseUnit) || !isFinite(pricePerBaseUnit))
          return {
            success: false,
            message: `Calculul prețului de bază a eșuat pentru ambalajul ${item.packaging}.`,
          }

        await recordStockMovement({
          stockableItem: item.packaging.toString(),
          stockableItemType: 'Packaging',
          movementType: 'RECEPTIE',
          quantity: baseQuantity,
          locationTo: targetLocation,
          referenceId: reception._id.toString(),
          note: `Recepție AMBALAJE de la furnizor ${reception.supplier.name}`,
          unitCost: pricePerBaseUnit,
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
    const result = await session.withTransaction(async () => {
      const reception = await ReceptionModel.findById(receptionId)
        .populate<{ supplier: { name: string } }>('supplier', 'name')
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

      // Inversăm mișcările de stoc
      const allItems = [
        ...(reception.products || []).map((p) => ({
          product: p.product,
          quantity: p.quantity,
          unitMeasure: p.unitMeasure,
          priceAtReception: p.priceAtReception,
          type: 'Product',
          itemId: p.product,
        })),
        ...(reception.packagingItems || []).map((p) => ({
                  packaging: p.packaging,
          quantity: p.quantity,
          unitMeasure: p.unitMeasure,
          priceAtReception: p.priceAtReception,
                  type: 'Packaging',
          itemId: p.packaging,
        })),
      ]

      for (const item of allItems) {
        if (!item.unitMeasure) {
          throw new Error(
            `Date corupte: Articolul cu ID ${item.itemId} de pe recepție nu are o unitate de măsură specificată.`
          )
        }

        const details = await getStockableItemDetails(
          item.itemId.toString(),
          item.type as 'Product' | 'Packaging'
        )
        let baseQuantity = 0

        switch (item.unitMeasure) {
          case details.unit:
            baseQuantity = item.quantity
            break
          case details.packagingUnit:
            if (!details.packagingQuantity || details.packagingQuantity <= 0)
              throw new Error(
                `Factor de conversie invalid pentru ${item.itemId}.`
              )
            baseQuantity = item.quantity * details.packagingQuantity
            break
          case 'palet':
            if (!details.itemsPerPallet || details.itemsPerPallet <= 0)
              throw new Error(
                `Factor de conversie pe palet invalid pentru ${item.itemId}.`
              )
            const totalBaseUnitsPerPallet = details.packagingQuantity
              ? details.itemsPerPallet * details.packagingQuantity
              : details.itemsPerPallet
            if (totalBaseUnitsPerPallet <= 0)
              throw new Error(
                `Calculul unităților pe palet a eșuat pentru ${item.itemId}.`
              )
            baseQuantity = item.quantity * totalBaseUnitsPerPallet
            break
          default:
            throw new Error(
              `Unitate de măsură '${item.unitMeasure}' invalidă pentru ${item.itemId}.`
            )
        }

        const sourceLocation =
          reception.destinationType === 'PROIECT'
            ? reception.destinationId!.toString()
            : reception.destinationLocation

        // Înregistrăm mișcarea cu cantitate negativă pentru a anula intrarea
        await recordStockMovement({
          stockableItem: item.itemId.toString(),
          stockableItemType: item.type as 'Product' | 'Packaging',
          movementType: 'ANULARE_RECEPTIE',
          quantity: baseQuantity,
          locationFrom: sourceLocation,
          referenceId: reception._id.toString(),
          note: `Anulare recepție de la furnizor ${reception.supplier.name}`,
          unitCost: 0, // Costul este anulat, nu adăugat
          timestamp: new Date(),
        })
      }

      // Schimbăm statusul înapoi în DRAFT
      reception.status = 'DRAFT'
      await reception.save({ session })

      return {
        success: true,
        message: 'Confirmarea recepției a fost revocată cu succes.',
        data: JSON.parse(JSON.stringify(reception)),
      }
    })
    return result
  } catch (error) {
    console.error('Eroare la revocarea confirmării:', error)
    return { success: false, message: (error as Error).message }
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
