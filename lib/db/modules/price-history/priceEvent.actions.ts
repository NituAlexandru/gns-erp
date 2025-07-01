'use server'
import { connectToDatabase } from '@/lib/db'
import PriceEventModel from './priceEvent.model'
import { PriceEventSchema, PriceEventInput } from './validator'

/**
 * Record a new purchase or sale.
 */
export async function recordPriceEvent(input: PriceEventInput) {
  const payload = PriceEventSchema.parse(input)
  await connectToDatabase()
  return await PriceEventModel.create(payload)
}

/**
 * Fetch the full ledger (optionally for one product).
 */
export async function getPriceEvents(productId?: string) {
  await connectToDatabase()
  const filter = productId ? { product: productId } : {}
  return PriceEventModel.find(filter).sort({ timestamp: 1 }).lean()
}
