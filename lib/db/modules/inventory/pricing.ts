import { connectToDatabase } from '@/lib/db'
import InventoryItemModel from './inventory.model'
import mongoose from 'mongoose'

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
    return 0
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
/**
 * Returns the last purchase price for a given stockable item.
 * It finds the batch with the most recent entryDate.
 * @param stockableItemId - The ID of the product or packaging.
 */
export async function getLastPurchasePrice(
  stockableItemId: string
): Promise<number | null> {
  await connectToDatabase()

  // Agregare pentru a găsi data cea mai recentă
  const result = await InventoryItemModel.aggregate([
    { $match: { stockableItem: new mongoose.Types.ObjectId(stockableItemId) } },
    { $unwind: '$batches' }, // Sparge array-ul de loturi
    { $sort: { 'batches.entryDate': -1 } }, // Sortează descrescător după data intrării
    { $limit: 1 }, // Ia doar primul (cel mai recent)
    { $project: { _id: 0, lastCost: '$batches.unitCost' } }, // Proiectează doar costul
  ])

  if (result.length > 0) {
    return result[0].lastCost
  }

  return null // Returnează null dacă nu există intrări
}
