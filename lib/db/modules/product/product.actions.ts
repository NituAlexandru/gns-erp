'use server'

import '@/lib/db/modules/client/client.model'
import { connectToDatabase } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ProductInputSchema, ProductUpdateSchema } from './validator'
import { formatError } from '@/lib/utils'
import { CategoryModel } from '../category'
import '@/lib/db/modules/suppliers/supplier.model'
import { FilterQuery, Types } from 'mongoose'
import { PRODUCT_PAGE_SIZE } from './constants'
import ERPProductModel from './product.model'
import { getGlobalHighestCostInStock } from '../inventory/pricing'
import {
  IProductDoc,
  IProductInput,
  IProductUpdate,
  MarkupPatch,
} from './types'

// O funcție helper pentru a verifica duplicatele
async function checkForDuplicateCodes(payload: {
  productCode: string
  barCode?: string
  _id?: string
}) {
  const { productCode, barCode, _id } = payload
  const commonQuery = _id ? { _id: { $ne: _id } } : {}

  const existingProduct = await ERPProductModel.findOne({
    productCode,
    ...commonQuery,
  }).lean()
  if (existingProduct) {
    return 'Acest cod de produs este deja utilizat.'
  }

  if (barCode) {
    const existingBarcode = await ERPProductModel.findOne({
      barCode,
      ...commonQuery,
    }).lean()
    if (existingBarcode) {
      return 'Acest cod de bare este deja utilizat.'
    }
  }

  return null // Nicio eroare
}
// CREATE
export async function createProduct(data: IProductInput) {
  try {
    const payload = ProductInputSchema.parse(data)
    await connectToDatabase()

    const duplicateError = await checkForDuplicateCodes(payload)
    if (duplicateError) {
      return { success: false, message: duplicateError }
    }

    await ERPProductModel.create(payload)
    revalidatePath('/admin/products')
    return { success: true, message: 'Product created successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// UPDATE
export async function updateProduct(data: IProductUpdate) {
  try {
    const payload = ProductUpdateSchema.parse(data)
    await connectToDatabase()

    const duplicateError = await checkForDuplicateCodes(payload)
    if (duplicateError) {
      return { success: false, message: duplicateError }
    }

    await ERPProductModel.findByIdAndUpdate(payload._id, payload)
    revalidatePath('/admin/products')
    return { success: true, message: 'Product updated successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
// GET ONE PRODUCT BY ID
export async function getProductById(id: string): Promise<IProductDoc> {
  await connectToDatabase()
  const doc = await ERPProductModel.findById(id)
    .populate('category')
    .populate('mainCategory')
    .populate('mainSupplier')
    .lean()
  if (!doc) throw new Error('Product not found')
  return JSON.parse(JSON.stringify(doc)) as IProductDoc
}
// DELETE
export async function deleteProduct(id: string) {
  try {
    await connectToDatabase()
    const res = await ERPProductModel.findByIdAndDelete(id)
    if (!res) throw new Error('Product not found')
    revalidatePath('/admin/products')
    return { success: true, message: 'Product deleted successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}
// GET ALL CATEGORIES
export async function getAllCategories(): Promise<
  { _id: string; name: string; slug: string }[]
> {
  await connectToDatabase()
  // Fetch only those categories that have a parent (mainCategory) set:
  return CategoryModel.find({ mainCategory: { $exists: true, $ne: null } })
    .select('_id name slug')
    .lean()
    .then((cats) =>
      cats.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        slug: c.slug,
      }))
    )
}
// GET PRODUCT BY SLUG
export async function getProductBySlug(
  slug: string,
  options?: { includeUnpublished: boolean }
): Promise<IProductDoc> {
  await connectToDatabase()

  // build a typed filter
  const filter: FilterQuery<IProductDoc> = { slug }
  if (!options?.includeUnpublished) {
    filter.isPublished = true
  }
  console.log('[DBG] getProductBySlug filter:', filter)

  const doc = await ERPProductModel.findOne(filter)
    .populate('category')
    .populate('mainCategory')
    .populate('mainSupplier')
    .populate({
      path: 'clientMarkups',
      populate: { path: 'clientId' },
    })
    .lean()

  if (!doc) {
    console.log('[DBG] no document found for slug:', slug)
    throw new Error('Product not found')
  }

  return JSON.parse(JSON.stringify(doc)) as IProductDoc
}

// GET ALL PRODUCTS with filters
export async function getAllProducts({
  query,
  category,
  mainCategory,
  tag,
  price,
  rating,
  sort,
  page,
  limit,
}: {
  query: string
  category: string
  mainCategory: string
  tag: string
  price?: string
  rating?: string
  sort?: string
  page: number
  limit?: number
}) {
  await connectToDatabase()
  limit = limit || PRODUCT_PAGE_SIZE
  const skipAmount = limit * (Number(page) - 1)

  const queryFilter =
    query && query !== 'all' ? { name: { $regex: query, $options: 'i' } } : {}
  let categoryFilter = {}
  if (category && category !== 'all') {
    if (Types.ObjectId.isValid(category)) {
      categoryFilter = { category: new Types.ObjectId(category) }
    } else {
      const catDoc = await CategoryModel.findOne({ slug: category })
        .select('_id')
        .lean()
      if (catDoc) {
        categoryFilter = { category: catDoc._id }
      } else {
        return {
          products: [],
          totalPages: 0,
          totalProducts: 0,
          from: 0,
          to: 0,
        }
      }
    }
  }
  let mainCategoryFilter = {}
  if (mainCategory && mainCategory !== 'all') {
    if (Types.ObjectId.isValid(mainCategory)) {
      mainCategoryFilter = {
        mainCategory: new Types.ObjectId(mainCategory),
      }
    } else {
      const mcDoc = await CategoryModel.findOne({ slug: mainCategory })
        .select('_id')
        .lean()
      if (mcDoc) {
        mainCategoryFilter = { mainCategory: mcDoc._id }
      } else {
        return {
          products: [],
          totalPages: 0,
          totalProducts: 0,
          from: 0,
          to: 0,
        }
      }
    }
  }
  const tagFilter = tag && tag !== 'all' ? { tags: tag } : {}
  const ratingFilter =
    rating && rating !== 'all' ? { avgRating: { $gte: Number(rating) } } : {}
  const priceFilter =
    price && price !== 'all'
      ? {
          price: {
            $gte: Number(price.split('-')[0]),
            $lte: Number(price.split('-')[1]),
          },
        }
      : {}

  const order: Record<string, 1 | -1> =
    sort === 'best-selling'
      ? { numSales: -1, _id: -1 }
      : sort === 'price-low-to-high'
        ? { price: 1, _id: -1 }
        : sort === 'price-high-to-low'
          ? { price: -1, _id: -1 }
          : sort === 'avg-customer-review'
            ? { avgRating: -1, _id: -1 }
            : { _id: -1 }

  const products = await ERPProductModel.find({
    isPublished: true,
    ...queryFilter,
    ...categoryFilter,
    ...mainCategoryFilter,
    ...tagFilter,
    ...priceFilter,
    ...ratingFilter,
  })
    .sort(order)
    .skip(skipAmount)
    .limit(limit)
    .populate('category', '_id name slug')
    .populate('mainCategory', '_id name slug')
    .lean()

  const countProducts = await ERPProductModel.countDocuments({
    isPublished: true,
    ...queryFilter,
    ...categoryFilter,
    ...mainCategoryFilter,
    ...tagFilter,
    ...priceFilter,
    ...ratingFilter,
  })

  return {
    products: JSON.parse(JSON.stringify(products)) as IProductDoc[],
    totalPages: Math.ceil(countProducts / limit),
    totalProducts: countProducts,
    from: skipAmount + 1,
    to: skipAmount + products.length,
  }
}


export async function updateProductMarkup(
  id: string,
  defaultMarkups: MarkupPatch
): Promise<{ success: boolean; message: string }> {
  try {
    await connectToDatabase()
    const product = await ERPProductModel.findById(id)
    if (!product) throw new Error('Produs inexistent.')

    await ERPProductModel.findByIdAndUpdate(
      id,
      { defaultMarkups },
      { new: true }
    )

    revalidatePath('/admin/products')
    return { success: true, message: 'Markup actualizat cu succes.' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

export async function updateProductAveragePurchasePrice(productId: string) {
  // 1. Calculăm cel mai mare cost din stocul curent
  const highestCost = await getGlobalHighestCostInStock(productId) // <-- Schimbă numele funcției aici

  // 2. Actualizăm câmpul pe documentul de produs
  await ERPProductModel.findByIdAndUpdate(productId, {
    averagePurchasePrice: highestCost, // Folosim noul cost
  })

  console.log(
    `Updated averagePurchasePrice for product ${productId} to HIGHEST cost: ${highestCost}`
  )
}
