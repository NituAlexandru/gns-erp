'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import {
  InventoryItemAdjustInput,
  InventoryItemAdjustSchema,
  StockMovementInput,
  StockMovementSchema,
} from './validator'
import { FilterQuery, startSession } from 'mongoose'
import { IN_TYPES } from './constants'

export async function adjustInventory(input: InventoryItemAdjustInput) {
  const { product, location, quantityOnHandDelta, quantityReservedDelta } =
    InventoryItemAdjustSchema.parse(input)

  await connectToDatabase()

  await InventoryItemModel.findOneAndUpdate(
    { product, location },
    {
      $inc: {
        quantityOnHand: quantityOnHandDelta,
        quantityReserved: quantityReservedDelta,
      },
    },
    { upsert: true }
  )
}

export async function recordStockMovement(input: StockMovementInput) {
  const payload = StockMovementSchema.parse(input)
  const session = await startSession()

  try {
    let movementDoc
    await session.withTransaction(async () => {
      const isInput = IN_TYPES.has(payload.movementType)

      // Locația relevantă pentru audit (unde se întâmplă mișcarea principală)
      const auditLocation = isInput ? payload.locationTo : payload.locationFrom

      if (!auditLocation) {
        throw new Error('Audit location is missing for the movement type.')
      }

      // 1) Citește soldul "before" din locația relevantă
      const auditDoc = await InventoryItemModel.findOne({
        product: payload.product,
        location: auditLocation,
      }).session(session)
      const balanceBefore = auditDoc?.quantityOnHand ?? 0

      // 2) Calculează soldul "after" corect, în funcție de tipul mișcării
      const balanceAfter = isInput
        ? balanceBefore + payload.quantity
        : balanceBefore - payload.quantity

      // 3) Ajustează stocurile "from" și "to"
      if (payload.locationFrom) {
        await InventoryItemModel.findOneAndUpdate(
          { product: payload.product, location: payload.locationFrom },
          { $inc: { quantityOnHand: -payload.quantity } },
          { upsert: true, session }
        )
      }
      if (payload.locationTo) {
        await InventoryItemModel.findOneAndUpdate(
          { product: payload.product, location: payload.locationTo },
          { $inc: { quantityOnHand: +payload.quantity } },
          { upsert: true, session }
        )
      }

      // 4) Înregistrează mișcarea cu audit complet
      const [createdMovement] = await StockMovementModel.create(
        [
          {
            ...payload,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
          },
        ],
        { session }
      )
      movementDoc = createdMovement
    })
    return movementDoc
  } finally {
    await session.endSession()
  }
}

export async function getInventoryLedger(productId: string, location?: string) {
  await connectToDatabase()

  // now `filter` is strongly typed to what Mongoose expects
  const filter: FilterQuery<IStockMovementDoc> = { product: productId }

  if (location) {
    filter.$or = [{ locationFrom: location }, { locationTo: location }]
  }

  return StockMovementModel.find(filter).sort({ timestamp: 1 }).lean()
}
export async function getCurrentStock(productId: string, locations?: string[]) {
  await connectToDatabase()

  // build a strongly-typed filter
  const filter: FilterQuery<IInventoryItemDoc> = { product: productId }

  if (locations && locations.length) {
    // only include these locations
    filter.location = { $in: locations }
  }

  // fetch matching InventoryItem docs
  const docs = await InventoryItemModel.find(filter).lean()

  // fold into per-location subtotals + grand total
  const byLocation: Record<string, number> = {}
  let grandTotal = 0

  for (const doc of docs) {
    const qty = doc.quantityOnHand
    byLocation[doc.location] = (byLocation[doc.location] || 0) + qty
    grandTotal += qty
  }

  return { byLocation, grandTotal }
}
