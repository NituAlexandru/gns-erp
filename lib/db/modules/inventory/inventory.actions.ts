'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import { StockMovementInput, StockMovementSchema } from './validator'
import { ClientSession, FilterQuery, startSession, Types } from 'mongoose'
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

export async function recordStockMovement(
  input: StockMovementInput,
  existingSession?: ClientSession
) {
  // Validarea datelor de intrare rămâne la început.
  const payload = StockMovementSchema.parse(input)

  const executeLogic = async (session: ClientSession) => {
    let isInput: boolean
    if (IN_TYPES.has(payload.movementType)) {
      isInput = true
    } else if (OUT_TYPES.has(payload.movementType)) {
      isInput = false
    } else {
      throw new Error(
        `Tipul de mișcare '${payload.movementType}' este necunoscut.`
      )
    }

    const auditLocation = isInput ? payload.locationTo : payload.locationFrom
    if (!auditLocation) {
      throw new Error('Locația (To/From) lipsește pentru acest tip de mișcare.')
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
      // Logică de ieșire (FIFO)
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
          // --- AICI ESTE CORECȚIA ---
          // Creăm un obiect nou cu proprietățile copiate manual
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

    return movement
  }

  if (existingSession) {
    return executeLogic(existingSession)
  } else {
    const session = await startSession()
    try {
      let result
      await session.withTransaction(async (transactionSession) => {
        result = await executeLogic(transactionSession)
      })
      return result
    } finally {
      await session.endSession()
    }
  }
}

// --- Funcție specifică pentru anularea corectă a mișcărilor de stoc ---
/**
 * Anulează mișcările de stoc asociate cu o anumită referință (ex: o recepție).
 * Această funcție șterge direct loturile corespunzătoare, evitând logica FIFO.
 * @param referenceId - ID-ul documentului de referință (ex: recepția).
 * @param session - Sesiunea Mongoose pentru tranzacție.
 */
export async function reverseStockMovementsByReference(
  referenceId: string,
  session: ClientSession
) {
  const movementsToReverse = await StockMovementModel.find({
    referenceId: referenceId,
    movementType: 'RECEPTIE',
  }).session(session)

  if (movementsToReverse.length === 0) {
    return
  }

  for (const movement of movementsToReverse) {
    const inventoryItem = await InventoryItemModel.findOne({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      location: movement.locationTo,
    }).session(session)

    if (!inventoryItem) {
      throw new Error(
        `Stocul pentru articolul ${movement.stockableItem} în locația ${movement.locationTo} nu a fost găsit la anulare.`
      )
    }

    const balanceBeforeReversal = inventoryItem.batches.reduce(
      (sum, b) => sum + b.quantity,
      0
    )

    const initialBatchesCount = inventoryItem.batches.length
    inventoryItem.batches = inventoryItem.batches.filter(
      (batch) => String(batch.movementId) !== String(movement._id)
    )

    if (inventoryItem.batches.length === initialBatchesCount) {
      console.warn(
        `Lotul pentru mișcarea ${movement._id} nu a fost găsit pentru a fi anulat.`
      )
      continue
    }

    await inventoryItem.save({ session })
    const balanceAfterReversal = inventoryItem.batches.reduce(
      (sum, b) => sum + b.quantity,
      0
    )

    const reversalMovement = new StockMovementModel({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      movementType: 'ANULARE_RECEPTIE',
      quantity: movement.quantity,
      locationFrom: movement.locationTo,
      referenceId: referenceId,
      note: `Anulare mișcare de recepție originală ${movement._id}`,
      timestamp: new Date(),
      balanceBefore: balanceBeforeReversal,
      balanceAfter: balanceAfterReversal,
    })
    await reversalMovement.save({ session })
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

