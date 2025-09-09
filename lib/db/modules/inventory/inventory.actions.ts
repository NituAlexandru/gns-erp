'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import { StockMovementInput, StockMovementSchema } from './validator'
import mongoose, {
  ClientSession,
  FilterQuery,
  startSession,
  Types,
} from 'mongoose'
import { IN_TYPES, OUT_TYPES } from './constants'
import { AggregatedStockItem, InventoryLocation } from './types'
import '@/lib/db/modules/product/product.model'
import '@/lib/db/modules/user/user.model'
import '@/lib/db/modules/packaging-products/packaging.model'
import { MovementsFiltersState } from '@/app/admin/management/inventory/movements/movements-filters'
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
        entryDate: payload.timestamp ?? new Date(),
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
    referenceId,
    movementType: 'RECEPTIE',
    status: 'ACTIVE',
  }).session(session)

  if (movementsToReverse.length === 0) {
    console.warn(
      `[REVOC] Nu au fost găsite mișcări ACTIVE de tip RECEPTIE pentru referința ${referenceId}.`
    )
    return
  }

  for (const movement of movementsToReverse) {
    const movementIdStr = String(movement._id)

    const inventoryItem = await InventoryItemModel.findOne({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      location: movement.locationTo,
    }).session(session)

    let balanceBeforeReversal = 0
    let balanceAfterReversal = 0

    // Dacă inventarul nu mai există la locația respectivă (ex: consumat complet),
    // înregistrăm doar mișcarea de anulare ca audit și trecem mai departe.
    if (inventoryItem) {
      balanceBeforeReversal = inventoryItem.batches.reduce(
        (sum, b) => sum + b.quantity,
        0
      )

      const initialBatchCount = inventoryItem.batches.length

      // Încercăm să ștergem lotul corespunzător
      inventoryItem.batches = inventoryItem.batches.filter(
        (batch) => String(batch.movementId) !== movementIdStr
      )

      const removed = inventoryItem.batches.length < initialBatchCount

      if (removed) {
        await inventoryItem.save({ session })
      } else {
        console.warn(
          `[REVOC] Lotul pentru mișcarea ${movementIdStr} nu a fost găsit în stoc (probabil consumat sau deja anulat).`
        )
      }

      balanceAfterReversal = inventoryItem.batches.reduce(
        (sum, b) => sum + b.quantity,
        0
      )
    } else {
      console.info(
        `[REVOC] Articolul de inventar pentru mișcarea ${movementIdStr} nu a fost găsit. Se înregistrează doar audit.`
      )
    }

    // Creăm mișcarea de audit de tip "ANULARE_RECEPTIE" pentru istoric
    const reversalMovement = new StockMovementModel({
      stockableItem: movement.stockableItem,
      stockableItemType: movement.stockableItemType,
      movementType: 'ANULARE_RECEPTIE',
      quantity: movement.quantity,
      unitMeasure: movement.unitMeasure,
      responsibleUser: movement.responsibleUser,
      locationFrom: movement.locationTo,
      referenceId,
      note: `Anulare mișcare recepție originală ${movementIdStr}`,
      timestamp: new Date(),
      balanceBefore: balanceBeforeReversal,
      balanceAfter: balanceAfterReversal,
    })
    await reversalMovement.save({ session })

    // PASUL 2: În loc să ștergem, ACTUALIZĂM statusul mișcării originale
    movement.status = 'CANCELLED'
    await movement.save({ session })
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
export async function getAggregatedStockStatus(): Promise<
  AggregatedStockItem[]
> {
  try {
    await connectToDatabase()

    const stockStatus = await InventoryItemModel.aggregate([
      // Grupează după 'stockableItem' și însumează cantitățile
      {
        $group: {
          _id: '$stockableItem', // Grupează după ID-ul produsului
          totalStock: { $sum: '$quantity' }, // Însumează cantitatea
        },
      },

      {
        $lookup: {
          from: 'erpproducts',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },

      {
        $unwind: '$productDetails',
      },

      {
        $project: {
          _id: 1, // Păstrează ID-ul produsului
          totalStock: 1, // Păstrează cantitatea totală
          name: '$productDetails.name',
          unit: '$productDetails.unit',
          productCode: '$productDetails.productCode',
        },
      },
      {
        $sort: {
          name: 1,
        },
      },
    ])

    return JSON.parse(JSON.stringify(stockStatus))
  } catch (error) {
    console.error('Eroare la agregarea stocului:', error)
    return []
  }
}

export async function getStockByLocation(
  locationId: InventoryLocation
): Promise<AggregatedStockItem[]> {
  try {
    await connectToDatabase()

    const stockStatus = await InventoryItemModel.aggregate([
      // Pasul 1: Filtrează documentele după locație
      {
        $match: {
          location: locationId,
        },
      },
      // Pasul 2: Grupează după 'stockableItem' și însumează cantitățile
      {
        $group: {
          _id: '$stockableItem',
          totalStock: { $sum: '$quantity' },
        },
      },
      // Pasul 3: Populează detaliile produsului
      {
        $lookup: {
          from: 'erpproducts',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      // Pasul 4: Destructurează array-ul de detalii
      {
        $unwind: '$productDetails',
      },
      // Pasul 5: Formatează rezultatul final
      {
        $project: {
          _id: 1,
          totalStock: 1,
          name: '$productDetails.name',
          unit: '$productDetails.unit',
          productCode: '$productDetails.productCode',
        },
      },
      // Pasul 6: Sortează după nume
      {
        $sort: {
          name: 1,
        },
      },
    ])

    return JSON.parse(JSON.stringify(stockStatus))
  } catch (error) {
    console.error(
      `Eroare la agregarea stocului pentru locația ${locationId}:`,
      error
    )
    return []
  }
}
export async function getStockMovements(filters: MovementsFiltersState) {
  try {
    await connectToDatabase()

    const pipeline: mongoose.PipelineStage[] = []

    // Pas 1: Lookups pentru Produse și Ambalaje (rămân la fel)
    pipeline.push({
      $lookup: {
        from: 'erpproducts',
        localField: 'stockableItem',
        foreignField: '_id',
        as: 'erpProductDetails',
      },
    })
    pipeline.push({
      $unwind: { path: '$erpProductDetails', preserveNullAndEmptyArrays: true },
    })

    pipeline.push({
      $lookup: {
        from: 'packagings',
        localField: 'stockableItem',
        foreignField: '_id',
        as: 'packagingDetails',
      },
    })
    pipeline.push({
      $unwind: { path: '$packagingDetails', preserveNullAndEmptyArrays: true },
    })

    // 👈 NOU: Adăugăm înapoi $lookup pentru Utilizatori
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'responsibleUser',
        foreignField: '_id',
        as: 'responsibleUserDetails',
      },
    })
    pipeline.push({
      $unwind: {
        path: '$responsibleUserDetails',
        preserveNullAndEmptyArrays: true,
      },
    })

    // Pas 2: Logica de filtrare (rămâne la fel)
    const matchConditions: mongoose.FilterQuery<IStockMovementDoc>[] = []

    if (filters.dateRange?.from) {
      matchConditions.push({
        timestamp: {
          $gte: filters.dateRange.from,
          ...(filters.dateRange.to && { $lte: filters.dateRange.to }),
        },
      })
    }

    if (filters.q && filters.q.trim() !== '') {
      const regex = new RegExp(filters.q, 'i')
      matchConditions.push({
        $or: [
          { 'erpProductDetails.name': regex },
          { 'packagingDetails.name': regex },
          { note: regex },
        ],
      })
    }
    if (filters.location && filters.location !== 'ALL') {
      matchConditions.push({
        $or: [
          { locationFrom: filters.location },
          { locationTo: filters.location },
        ],
      })
    }
    if (filters.type && filters.type !== 'ALL') {
      matchConditions.push({ movementType: filters.type })
    }
    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } })
    }

    // Pas 3: Sortarea (rămâne la fel)
    pipeline.push({ $sort: { timestamp: -1 } })

    // Pas 4: Formatarea finală (include acum și datele utilizatorului)
    pipeline.push({
      $project: {
        _id: 1,
        movementType: 1,
        quantity: 1,
        unitMeasure: 1,
        timestamp: 1,
        locationFrom: 1,
        locationTo: 1,
        note: 1,
        balanceBefore: 1,
        balanceAfter: 1,
        // Re-structurează `responsibleUser` cu datele din $lookup
        responsibleUser: {
          _id: '$responsibleUserDetails._id',
          name: '$responsibleUserDetails.name',
        },
        stockableItem: {
          _id: '$stockableItem',
          name: {
            $ifNull: ['$erpProductDetails.name', '$packagingDetails.name'],
          },
        },
      },
    })

    const movements = await StockMovementModel.aggregate(pipeline)
    return JSON.parse(JSON.stringify(movements))
  } catch (error) {
    console.error('Eroare la preluarea mișcărilor de stoc:', error)
    return []
  }
}
