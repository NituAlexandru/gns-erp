'use server'

import { connectToDatabase } from '@/lib/db'
import InventoryItemModel, { IInventoryItemDoc } from './inventory.model'
import StockMovementModel, { IStockMovementDoc } from './movement.model'
import {
  InventoryItemAdjustInput,
  InventoryItemAdjustSchema,
  StockMovementSchema,
} from './validator'
import type { StockMovementInput } from './types'
import { FilterQuery } from 'mongoose'

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
  await connectToDatabase()

  // 1) read "before" balance
  const fromDoc = payload.locationFrom
    ? await InventoryItemModel.findOne({
        product: payload.product,
        location: payload.locationFrom,
      })
    : null
  const beforeQty = fromDoc?.quantityOnHand ?? 0

  // 2) adjust "from" and "to"
  if (payload.locationFrom) {
    await InventoryItemModel.findOneAndUpdate(
      { product: payload.product, location: payload.locationFrom },
      { $inc: { quantityOnHand: -payload.quantity } },
      { upsert: true }
    )
  }
  if (payload.locationTo) {
    await InventoryItemModel.findOneAndUpdate(
      { product: payload.product, location: payload.locationTo },
      { $inc: { quantityOnHand: +payload.quantity } },
      { upsert: true }
    )
  }

  // 3) read "after" balance
  const afterDoc = payload.locationFrom
    ? await InventoryItemModel.findOne({
        product: payload.product,
        location: payload.locationFrom,
      })
    : null
  const afterQty = afterDoc?.quantityOnHand ?? beforeQty

  // 4) persist one movement with full audit
  return await StockMovementModel.create({
    ...payload,
    balanceBefore: beforeQty,
    balanceAfter: afterQty,
  })
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
