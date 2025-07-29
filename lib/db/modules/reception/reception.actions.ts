// reception/actions.ts
'use server'

import { connectToDatabase } from '@/lib/db'
import ReceptionModel from './reception.model'
import { ReceptionCreateSchema, ReceptionUpdateSchema } from './validator'
import { ReceptionCreateInput, ReceptionUpdateInput } from './types' // Acum importăm tipurile de aici
import mongoose from 'mongoose'
import { recordStockMovement } from '../inventory/inventory.actions'

export async function createReception(data: ReceptionCreateInput) {
  const payload = ReceptionCreateSchema.parse(data)
  await connectToDatabase()
  // Asigură-te că transmiți un obiect compatibil cu modelul
  const newReception = await ReceptionModel.create(payload)
  return {
    success: true,
    message: 'Recepție creată cu succes',
    data: JSON.parse(JSON.stringify(newReception)),
  }
}

export async function updateReception(data: ReceptionUpdateInput) {
  const payload = ReceptionUpdateSchema.parse(data)
  const { _id, ...updateData } = payload
  await connectToDatabase()

  // ▼▼▼ ADAUGĂ ACEST BLOC DE COD - de modificat pe viitor ▼▼▼
  const receptionToUpdate = await ReceptionModel.findById(_id)
  if (!receptionToUpdate) {
    throw new Error(
      'Recepția pe care încercați să o modificați nu a fost găsită.'
    )
  }
  if (receptionToUpdate.status === 'CONFIRMED') {
    throw new Error(
      'O recepție confirmată nu poate fi modificată. Trebuie anulat/stornat impactul inițial.'
    )
  }
  // ▲▲▲ SFÂRȘIT BLOC DE COD ▲▲▲

  await ReceptionModel.findByIdAndUpdate(_id, updateData)
  return { success: true, message: 'Recepție actualizată cu succes' }
}

export async function getReceptionById(id: string) {
  await connectToDatabase()
  const rec = await ReceptionModel.findById(id).lean()
  if (!rec) throw new Error('Recepție inexistentă')
  return JSON.parse(JSON.stringify(rec))
}
/**
 * Finalizează o recepție, îi schimbă statusul în 'CONFIRMED'
 * și înregistrează intrarea în stoc pentru toate articolele.
 * Operațiunea este tranzacțională.
 * @param receptionId ID-ul recepției de confirmat.
 */

export async function confirmReception(receptionId: string) {
  const session = await mongoose.startSession()
  try {
    let confirmedReception
    await session.withTransaction(async () => {
      const reception =
        await ReceptionModel.findById(receptionId).session(session)
      if (!reception) throw new Error('Recepția nu a fost găsită')
      if (reception.status === 'CONFIRMED')
        throw new Error('Recepția este deja confirmată')

      // ▼▼▼ LOGICA NOUĂ PENTRU DESTINAȚIE ▼▼▼
      let targetLocation: string
      if (reception.destinationType === 'PROIECT') {
        if (!reception.destinationId) {
          // Această verificare este o siguranță suplimentară
          throw new Error(
            'ID-ul de proiect lipsește pentru o recepție de tip proiect.'
          )
        }
        targetLocation = reception.destinationId.toString()
      } else {
        targetLocation = 'DEPOZIT'
      }
      // ▲▲▲ SFÂRȘIT LOGICA NOUĂ ▲▲▲

      // Parcurge produsele
      for (const item of reception.products) {
        await recordStockMovement({
          stockableItem: item.product.toString(),
          stockableItemType: 'Product',
          movementType: 'RECEPTIE',
          quantity: item.quantity,
          locationTo: targetLocation, // <-- Folosim destinația dinamică
          referenceId: reception._id.toString(),
          note: `Recepție PRODUSE de la furnizor ${reception.supplier.toString()}`,
          unitCost: item.priceAtReception ?? undefined,
          timestamp: reception.receptionDate,
        })
      }

      // Parcurge ambalajele
      for (const item of reception.packagingItems) {
        await recordStockMovement({
          stockableItem: item.packaging.toString(),
          stockableItemType: 'Packaging',
          movementType: 'RECEPTIE',
          quantity: item.quantity,
          locationTo: targetLocation, // <-- Folosim destinația dinamică
          referenceId: reception._id.toString(),
          note: `Recepție AMBALAJE de la furnizor ${reception.supplier.toString()}`,
          unitCost: item.priceAtReception ?? undefined,
          timestamp: reception.receptionDate,
        })
      }

      reception.status = 'CONFIRMED'
      await reception.save({ session })
      confirmedReception = reception
    })
    return {
      success: true,
      message: 'Recepție confirmată și stoc actualizat!',
      data: JSON.parse(JSON.stringify(confirmedReception)),
    }
  } catch (error) {
    return { success: false, message: (error as Error).message }
  } finally {
    await session.endSession()
  }
}
