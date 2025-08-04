'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import { StockMovementInput, StockMovementSchema } from './validator'
import { FilterQuery, startSession, Types } from 'mongoose'
import { IN_TYPES, OUT_TYPES } from './constants'

/**
 * Înregistrează o mișcare de stoc (IN/OUT) conform logicii FIFO.
 * Gestionează adăugarea și consumarea de loturi.
 * Câmpurile `locationTo` și `locationFrom` pot fi locații predefinite (ex: 'DEPOZIT')
 * sau ID-ul unui Proiect, pentru gestiunea stocurilor pe proiecte.
 * Această operație este tranzacțională.
 * @param input Detaliile mișcării de stoc.
 * @returns Documentul de mișcare de stoc creat.
 */

export async function recordStockMovement(input: StockMovementInput) {
  const payload = StockMovementSchema.parse(input)
  const session = await startSession()
  try {
    let movementDoc
    await session.withTransaction(async () => {
      let isInput: boolean
      if (IN_TYPES.has(payload.movementType)) {
        isInput = true
      } else if (OUT_TYPES.has(payload.movementType)) {
        isInput = false
      } else {
        throw new Error(
          `Tipul de mișcare '${payload.movementType}' este necunoscut și neclasificat ca IN sau OUT.`
        )
      }

      const auditLocation = isInput ? payload.locationTo : payload.locationFrom
      if (!auditLocation) {
        throw new Error(
          'Locația pentru audit lipsește pentru acest tip de mișcare.'
        )
      }

      let inventoryItem = await InventoryItemModel.findOne({
        stockableItem: payload.stockableItem,
        stockableItemType: payload.stockableItemType,
        location: auditLocation,
      }).session(session)

      if (!inventoryItem) {
        inventoryItem = new InventoryItemModel({
          stockableItem: payload.stockableItem,
          stockableItemType: payload.stockableItemType,
          location: auditLocation,
          batches: [],
        })
      }

      const balanceBefore = inventoryItem.batches.reduce(
        (sum, batch) => sum + batch.quantity,
        0
      )

      const movement = new StockMovementModel({
        ...payload,
        balanceBefore,
        balanceAfter: 0,
      })

      if (isInput) {
        if (payload.unitCost === undefined) {
          throw new Error(
            'Costul unitar este obligatoriu pentru mișcările de intrare.'
          )
        }
        inventoryItem.batches.push({
          quantity: payload.quantity,
          unitCost: payload.unitCost,
          entryDate: payload.timestamp,
          movementId: movement._id as Types.ObjectId,
        })
        inventoryItem.batches.sort(
          (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
        )
      } else {
        let quantityToDecrease = payload.quantity
        if (quantityToDecrease > balanceBefore) {
          throw new Error('Stoc insuficient.')
        }

        const newBatches = []
        for (const batch of inventoryItem.batches) {
          if (quantityToDecrease <= 0) {
            newBatches.push(batch)
            continue
          }
          if (batch.quantity > quantityToDecrease) {
            newBatches.push({
              quantity: batch.quantity - quantityToDecrease,
              unitCost: batch.unitCost,
              entryDate: batch.entryDate,
              movementId: batch.movementId,
            })
            quantityToDecrease = 0
          } else {
            quantityToDecrease -= batch.quantity
          }
        }
        inventoryItem.batches = newBatches
      }

      await inventoryItem.save({ session })

      const balanceAfter = inventoryItem.batches.reduce(
        (sum, batch) => sum + batch.quantity,
        0
      )
      movement.balanceAfter = balanceAfter
      await movement.save({ session })

      movementDoc = movement
    })
    return movementDoc
  } finally {
    await session.endSession()
  }
}

export async function getInventoryLedger(
  stockableItemId: string,
  location?: string
) {
  await connectToDatabase()
  const filter: FilterQuery<IStockMovementDoc> = {
    stockableItem: stockableItemId,
  }
  if (location) {
    filter.$or = [{ locationFrom: location }, { locationTo: location }]
  }
  return StockMovementModel.find(filter).sort({ timestamp: 1 }).lean()
}

export async function getCurrentStock(
  stockableItemId: string,
  locations?: string[]
) {
  await connectToDatabase()
  const filter: FilterQuery<IInventoryItemDoc> = {
    stockableItem: stockableItemId,
  }
  if (locations && locations.length) {
    filter.location = { $in: locations }
  }
  const docs = await InventoryItemModel.find(filter).lean()

  const byLocation: Record<string, number> = {}
  let grandTotal = 0

  for (const doc of docs) {
    const locationTotal = doc.batches.reduce(
      (sum, batch) => sum + batch.quantity,
      0
    )
    byLocation[doc.location] = (byLocation[doc.location] || 0) + locationTotal
    grandTotal += locationTotal
  }

  return { byLocation, grandTotal }
}
