'use server'

import { startSession, Types } from 'mongoose'
import {
  AdjustStockInput,
  adjustStockSchema,
  TransferStockInput,
  transferStockSchema,
} from './validator'
import InventoryItemModel from './inventory.model'
import StockMovementModel from './movement.model'
import ArchivedBatchModel from './archived-batch.model'
import { IN_TYPES, LOCATION_NAMES_MAP, OUT_TYPES } from './constants'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/db'
import { recalculateInventorySummary } from './inventory.actions.core'
import { auth } from '@/auth'

/**
 * Transferă o cantitate dintr-un lot specific dintr-o locație în alta.
 * Operațiunea este atomică (folosește tranzacție).
 * NU folosește FIFO, ci identifică lotul exact după batchId.
 */
export async function transferStock(input: TransferStockInput) {
  const session = await startSession()
  session.startTransaction()

  try {
    await connectToDatabase()
    const payload = transferStockSchema.parse(input)

    const transferGroupId = new Types.ObjectId()

    const userSession = await auth()
    if (!userSession?.user) {
      throw new Error('Utilizatorul nu este autentificat.')
    }

    // 1. Găsim documentul sursă (InventoryItem)
    const sourceItem = await InventoryItemModel.findById(
      payload.sourceInventoryItemId
    )
      .populate('stockableItem')
      .session(session)

    if (!sourceItem) {
      throw new Error('Sursa de inventar nu a fost găsită.')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemData = sourceItem.stockableItem as any

    const unitMeasure =
      itemData?.unit || // ERPProduct
      itemData?.packagingUnit || // Packaging
      '-'
    // 2. Găsim lotul specific în array-ul sursă
    const batchIndex = sourceItem.batches.findIndex(
      (b: any) => b._id.toString() === payload.batchId
    )

    if (batchIndex === -1) {
      throw new Error('Lotul specificat nu a fost găsit în locația sursă.')
    }

    const targetBatch = sourceItem.batches[batchIndex]

    // 3. Verificăm disponibilitatea
    if (targetBatch.quantity < payload.quantity) {
      throw new Error(
        `Cantitate insuficientă în lot. Disponibil: ${targetBatch.quantity}, Solicitat: ${payload.quantity}`
      )
    }

    // --- OPERAȚIUNEA DE IEȘIRE (SURSA) ---

    // Salvăm datele lotului înainte să le modificăm (pentru a le copia la destinație)
    const batchSnapshot = {
      unitCost: targetBatch.unitCost,
      supplierId: targetBatch.supplierId,
      qualityDetails: targetBatch.qualityDetails,
      entryDate: targetBatch.entryDate,
      movementId: targetBatch.movementId, // Păstrăm trasabilitatea intrării originale
    }

    // Scădem cantitatea
    if (targetBatch.quantity === payload.quantity) {
      // Se consumă tot -> Arhivăm și ștergem
      await ArchivedBatchModel.create(
        [
          {
            originalItemId: sourceItem._id,
            stockableItem: sourceItem.stockableItem,
            stockableItemType: sourceItem.stockableItemType,
            location: sourceItem.location,
            quantityOriginal: targetBatch.quantity,
            unitCost: targetBatch.unitCost,
            entryDate: targetBatch.entryDate,
            movementId: targetBatch.movementId,
            supplierId: targetBatch.supplierId,
            qualityDetails: targetBatch.qualityDetails,
            archivedAt: new Date(),
            notes: `Transferat integral către ${payload.targetLocation}`,
          },
        ],
        { session }
      )
      // Ștergem din array
      sourceItem.batches.splice(batchIndex, 1)
    } else {
      // Scădem parțial
      targetBatch.quantity -= payload.quantity
    }

    // Recalculăm totalurile pe sursă
    await recalculateInventorySummary(sourceItem)
    await sourceItem.save({ session })

    // Înregistrăm mișcarea de IEȘIRE (Audit)
    await StockMovementModel.create(
      [
        {
          stockableItem: sourceItem.stockableItem,
          stockableItemType: sourceItem.stockableItemType,
          movementType: 'TRANSFER_OUT',
          locationFrom: sourceItem.location,
          locationTo: payload.targetLocation,
          quantity: payload.quantity,
          unitMeasure: unitMeasure, 
          responsibleUser: userSession.user.id,
          responsibleUserName: userSession.user.name,
          unitCost: batchSnapshot.unitCost, // Iese cu prețul de intrare
          lineCost: payload.quantity * batchSnapshot.unitCost,
          balanceBefore: sourceItem.totalStock + payload.quantity,
          balanceAfter: sourceItem.totalStock,
          note: `Transfer ieșire din gestiune - ${LOCATION_NAMES_MAP[sourceItem.location as keyof typeof LOCATION_NAMES_MAP] || sourceItem.location}`,
          referenceId: transferGroupId,
          supplierId: batchSnapshot.supplierId,
          qualityDetails: batchSnapshot.qualityDetails,
          timestamp: new Date(),
        },
      ],
      { session }
    )

    // --- OPERAȚIUNEA DE INTRARE (DESTINAȚIA) ---

    // Căutăm sau creăm item-ul de inventar pentru destinație
    let destItem = await InventoryItemModel.findOne({
      stockableItem: sourceItem.stockableItem,
      stockableItemType: sourceItem.stockableItemType,
      location: payload.targetLocation,
    }).session(session)

    if (!destItem) {
      destItem = new InventoryItemModel({
        stockableItem: sourceItem.stockableItem,
        stockableItemType: sourceItem.stockableItemType,
        location: payload.targetLocation,
        batches: [],
        totalStock: 0,
        quantityReserved: 0,
      })
    }

    // Adăugăm lotul în destinație (copie identică a datelor, doar cantitatea e cea transferată)
    destItem.batches.push({
      _id: new Types.ObjectId(), 
      quantity: payload.quantity,
      unitCost: batchSnapshot.unitCost,
      entryDate: batchSnapshot.entryDate, // Păstrăm vechimea lotului!
      movementId: batchSnapshot.movementId, // Păstrăm legătura cu intrarea originală
      supplierId: batchSnapshot.supplierId,
      qualityDetails: batchSnapshot.qualityDetails,
    })

    // Recalculăm totalurile pe destinație
    await recalculateInventorySummary(destItem)
    await destItem.save({ session })
    // Înregistrăm mișcarea de INTRARE (Audit)
    await StockMovementModel.create(
      [
        {
          stockableItem: sourceItem.stockableItem,
          stockableItemType: sourceItem.stockableItemType,
          movementType: 'TRANSFER_IN',
          locationFrom: sourceItem.location,
          locationTo: payload.targetLocation,
          quantity: payload.quantity,
          unitMeasure: unitMeasure,
          responsibleUser: userSession.user.id,
          responsibleUserName: userSession.user.name,
          unitCost: batchSnapshot.unitCost,
          lineCost: payload.quantity * batchSnapshot.unitCost,
          balanceBefore: destItem.totalStock - payload.quantity,
          balanceAfter: destItem.totalStock,
          note: `Transfer intrare din gestiune - ${LOCATION_NAMES_MAP[sourceItem.location as keyof typeof LOCATION_NAMES_MAP] || sourceItem.location}`,
          referenceId: transferGroupId,
          supplierId: batchSnapshot.supplierId,
          qualityDetails: batchSnapshot.qualityDetails,
          timestamp: new Date(),
        },
      ],
      { session }
    )

    await session.commitTransaction()

    revalidatePath('/admin/management/inventory/stock')
    return { success: true }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare la transfer:', error)
    return {
      success: false,
      error: error.message || 'Transferul a eșuat.',
    }
  } finally {
    session.endSession()
  }
}

/**
 * Ajustează manual stocul (Plus sau Minus).
 * - Minus: Necesită batchId obligatoriu.
 * - Plus: Poate fi pe lot existent (batchId) sau lot nou (fără batchId).
 */
export async function adjustStock(input: AdjustStockInput) {
  const session = await startSession()
  session.startTransaction()

  try {
    await connectToDatabase()
    const payload = adjustStockSchema.parse(input)

    const adjustmentId = new Types.ObjectId()

    const userSession = await auth()
    if (!userSession?.user) {
      throw new Error('Utilizatorul nu este autentificat.')
    }

    const item = await InventoryItemModel.findById(payload.inventoryItemId)
      .populate('stockableItem')
      .session(session)

    if (!item) throw new Error('Articolul nu a fost găsit.')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemData = item.stockableItem as any
    const unitMeasure =
      itemData?.unit || // ERPProduct
      itemData?.packagingUnit || // Packaging
      '-'
    const isIn = IN_TYPES.has(payload.adjustmentType)
    const isOut = OUT_TYPES.has(payload.adjustmentType)

    if (!isIn && !isOut) {
      throw new Error('Tipul ajustării este invalid.')
    }

    // Stabilim costul: Manual (din input) SAU Automat (ultimul preț) SAU 0
    let unitCost = payload.unitCost ?? (item.lastPurchasePrice || 0)

    const balanceBefore = item.totalStock
    let balanceAfter = 0
    let supplierId = undefined
    let qualityDetails = undefined

    // Generăm ID-ul mișcării de acum, ca să îl putem lega de lotul nou (dacă e cazul)
    const movementId = new Types.ObjectId()

    // --- LOGICA DE IEȘIRE (SCĂDERE) ---
    if (isOut) {
      // La ieșire, batchId este OBLIGATORIU (trebuie să știm de unde scădem)
      if (!payload.batchId) {
        throw new Error(
          'Pentru scădere stoc, selectarea lotului este obligatorie.'
        )
      }

      const batchIndex = item.batches.findIndex(
        (b: any) => b._id.toString() === payload.batchId
      )

      if (batchIndex === -1) {
        throw new Error('Lotul specificat nu a fost găsit.')
      }

      const targetBatch = item.batches[batchIndex]

      if (targetBatch.quantity < payload.quantity) {
        throw new Error(
          `Stoc insuficient pe lotul selectat (Disponibil: ${targetBatch.quantity}).`
        )
      }

      // Luăm datele reale ale lotului pentru istoric
      unitCost = targetBatch.unitCost // La ieșire, costul este cel al lotului, nu cel manual!
      supplierId = targetBatch.supplierId
      qualityDetails = targetBatch.qualityDetails

      // Scădere efectivă
      if (targetBatch.quantity === payload.quantity) {
        // Arhivare
        await ArchivedBatchModel.create(
          [
            {
              originalItemId: item._id,
              stockableItem: item.stockableItem,
              stockableItemType: item.stockableItemType,
              location: item.location,
              quantityOriginal: targetBatch.quantity,
              unitCost: targetBatch.unitCost,
              entryDate: targetBatch.entryDate,
              movementId: targetBatch.movementId,
              supplierId: targetBatch.supplierId,
              qualityDetails: targetBatch.qualityDetails,
              archivedAt: new Date(),
              notes: `Ajustare stoc: ${payload.adjustmentType} - ${payload.reason}`,
            },
          ],
          { session }
        )
        item.batches.splice(batchIndex, 1)
      } else {
        targetBatch.quantity -= payload.quantity
      }

      await recalculateInventorySummary(item)
      balanceAfter = item.totalStock
    }

    // --- LOGICA DE INTRARE (CREȘTERE) ---
    else if (isIn) {
      // CAZUL A: Adăugăm peste un lot existent (Corecție numărătoare)
      if (payload.batchId) {
        const batchIndex = item.batches.findIndex(
          (b: any) => b._id.toString() === payload.batchId
        )

        if (batchIndex === -1) {
          throw new Error('Lotul destinație nu mai există.')
        }

        const targetBatch = item.batches[batchIndex]

        // Creștem cantitatea
        targetBatch.quantity += payload.quantity

        // La adăugare pe lot existent, păstrăm costul și detaliile originale ale lotului
        unitCost = targetBatch.unitCost
        supplierId = targetBatch.supplierId
        qualityDetails = targetBatch.qualityDetails
      }
      // CAZUL B: Lot Nou (Marfă găsită, fără identitate clară)
      else {
        item.batches.push({
          _id: new Types.ObjectId(), // Generăm ID lot
          quantity: payload.quantity,
          unitCost: unitCost, // Costul decis (manual sau lastPrice)
          entryDate: new Date(), // Intră azi
          movementId: movementId, // Legăm de mișcarea curentă de ajustare
          supplierId: undefined, // Nu știm furnizorul
          qualityDetails: { additionalNotes: payload.reason },
        })
      }

      await recalculateInventorySummary(item)
      balanceAfter = item.totalStock
    }

    await item.save({ session })

    // --- LOG (StockMovement) ---
    // Folosim ID-ul generat mai sus (movementId)
    const movement = new StockMovementModel({
      _id: movementId,
      stockableItem: item.stockableItem,
      stockableItemType: item.stockableItemType,
      movementType: payload.adjustmentType,
      locationFrom: isOut ? item.location : undefined,
      locationTo: isIn ? item.location : undefined,
      quantity: payload.quantity,
      unitMeasure: unitMeasure,
      responsibleUser: userSession.user.id,
      responsibleUserName: userSession.user.name,
      unitCost: unitCost,
      lineCost: payload.quantity * unitCost,
      balanceBefore: balanceBefore,
      balanceAfter: balanceAfter,
      note: payload.reason,
      referenceId: adjustmentId,
      supplierId: supplierId,
      qualityDetails: qualityDetails,
      timestamp: new Date(),
    })

    await movement.save({ session })

    await session.commitTransaction()
    revalidatePath('/admin/management/inventory/stock')
    return { success: true }
  } catch (error: any) {
    await session.abortTransaction()
    console.error('Eroare la ajustare:', error)
    return {
      success: false,
      error: error.message || 'Ajustarea a eșuat.',
    }
  } finally {
    session.endSession()
  }
}
