import { connectToErpDatabase } from '@/lib/db'
import Product from '@/lib/db/models/product.model'

export async function getAllCategories() {
  await connectToErpDatabase()
  const categories = await Product.find({ isPublished: true }).distinct(
    'category'
  )
  return categories
}
