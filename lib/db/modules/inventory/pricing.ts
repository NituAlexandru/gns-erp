import { connectToDatabase } from '@/lib/db'
import InventoryItemModel from './inventory.model'
import { Types } from 'mongoose'

/** Returns the current weighted‐average cost for one product/location. */
export async function getWeightedCost(
  productId: string,
  location: string
): Promise<number> {
  await connectToDatabase()
  const doc = await InventoryItemModel.findOne({
    product: new Types.ObjectId(productId),
    location,
  })
  return doc?.averageCost ?? 0
}

/**
 * Returns the overall weighted‐average cost of stock across *all*
 * locations for a given product.
 */
export async function getGlobalWeightedCost(
  productId: string
): Promise<number> {
  await connectToDatabase()
  const agg = await InventoryItemModel.aggregate([
    { $match: { product: new Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        totalUnits: { $sum: '$quantityOnHand' },
        totalValue: {
          $sum: { $multiply: ['$quantityOnHand', '$averageCost'] },
        },
      },
    },
    {
      $project: {
        overallAvgCost: {
          $cond: [
            { $eq: ['$totalUnits', 0] },
            0,
            { $divide: ['$totalValue', '$totalUnits'] },
          ],
        },
      },
    },
  ])

  return (agg[0]?.overallAvgCost as number) ?? 0
}
