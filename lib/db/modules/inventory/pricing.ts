// pricing.ts
import { connectToDatabase } from '@/lib/db'
import InventoryItemModel from './inventory.model'

/**
 * Returns the highest purchase price for an item currently in stock at a specific location.
 */
export async function getHighestCostInStock(
  stockableItemId: string,
  location: string
): Promise<number> {
  await connectToDatabase()
  const doc = await InventoryItemModel.findOne({
    stockableItem: stockableItemId,
    location,
  })

  if (!doc || doc.batches.length === 0) {
    return 0 // Fără stoc, fără preț
  }

  // Găsește costul maxim din toate loturile existente
  return Math.max(...doc.batches.map((batch) => batch.unitCost))
}

/**
 * Returns the overall highest purchase price of an item across *all* locations.
 */
export async function getGlobalHighestCostInStock(
  stockableItemId: string
): Promise<number> {
  await connectToDatabase()
  const docs = await InventoryItemModel.find({
    stockableItem: stockableItemId,
  })

  const allCosts = docs.flatMap((doc) =>
    doc.batches.map((batch) => batch.unitCost)
  )

  if (allCosts.length === 0) {
    return 0
  }

  return Math.max(...allCosts)
}
