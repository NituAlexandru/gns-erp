'use server'

import { connectToDatabase } from '@/lib/db'
import type {
  IProductInput,
  IProductUpdate,
  IProductDoc,
  MarkupPatch,
} from './types'
import { revalidatePath } from 'next/cache'
import { ProductInputSchema, ProductUpdateSchema } from './validator'
import { formatError } from '@/lib/utils'
import { ADMIN_PAGE_SIZE, PAGE_SIZE } from '@/lib/constants'
import { CategoryModel } from '../category'
import '@/lib/db/modules/suppliers/supplier.model'
import { Types } from 'mongoose'
import { PRODUCT_PAGE_SIZE } from './constants'
import ERPProductModel from './product.model'

// CREATE
export async function createProduct(data: IProductInput) {
  try {
    const payload = ProductInputSchema.parse(data)
    await connectToDatabase()
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
// GET ALL MAIN CATEGORIES
export async function getAllMainCategories(): Promise<
  { _id: string; name: string; slug: string }[]
> {
  await connectToDatabase()
  const docs = await CategoryModel.find(
    { mainCategory: { $exists: false } },
    { _id: 1, name: 1, slug: 1 }
  ).lean()

  return docs.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
  }))
}
// GET PRODUCTS FOR CARD
export async function getProductsForCard({
  tag,
  limit = 4,
}: {
  tag: string
  limit?: number
}) {
  await connectToDatabase()
  const products = await ERPProductModel.find(
    { tags: { $in: [tag] }, isPublished: true },
    {
      name: 1,
      href: { $concat: ['/product/', '$slug'] },
      image: { $arrayElemAt: ['$images', 0] },
    }
  )
    .sort({ createdAt: 'desc' })
    .limit(limit)
    .lean()

  return JSON.parse(JSON.stringify(products)) as {
    name: string
    href: string
    image: string
  }[]
}
// GET RANDOM PRODUCTS FOR CARD
export async function getProductsRandomForCard({
  tag,
  limit = 4,
}: {
  tag: string
  limit?: number
}) {
  await connectToDatabase()
  const products = await ERPProductModel.aggregate([
    { $match: { tags: { $in: [tag] }, isPublished: true } },
    { $sample: { size: limit } },
    {
      $project: {
        name: 1,
        href: { $concat: ['/product/', '$slug'] },
        image: { $arrayElemAt: ['$images', 0] },
        _id: 0,
      },
    },
  ])

  return JSON.parse(JSON.stringify(products)) as {
    name: string
    href: string
    image: string
  }[]
}
// GET PRODUCTS BY TAG
export async function getProductsByTag({
  tag,
  limit = 10,
}: {
  tag: string
  limit?: number
}) {
  await connectToDatabase()
  const products = await ERPProductModel.find({
    tags: { $in: [tag] },
    isPublished: true,
  })
    .sort({ createdAt: 'desc' })
    .limit(limit)
    .lean()
  return JSON.parse(JSON.stringify(products)) as IProductDoc[]
}
// GET RANDOM PRODUCTS BY TAG
export async function getProductsRandomByTag({
  tag,
  limit = 10,
}: {
  tag: string
  limit?: number
}) {
  await connectToDatabase()
  const products = await ERPProductModel.aggregate([
    { $match: { tags: { $in: [tag] }, isPublished: true } },
    { $sample: { size: limit } },
  ])
  return JSON.parse(JSON.stringify(products)) as IProductDoc[]
}
// GET PRODUCT BY SLUG
export async function getProductBySlug(slug: string): Promise<IProductDoc> {
  await connectToDatabase()

  const doc = await ERPProductModel.findOne({ slug, isPublished: true })
    .populate('category')
    .populate('mainCategory')
    .populate('mainSupplier')
    .populate({
      path: 'clientMarkups',
      populate: {
        path: 'clientId',
      },
    })
    .lean()

  if (!doc) throw new Error('Product not found')
  return JSON.parse(JSON.stringify(doc)) as IProductDoc
}
// GET RELATED PRODUCTS BY CATEGORY
export async function getRelatedProductsByCategory({
  category,
  productId,
  limit = PAGE_SIZE,
  page = 1,
}: {
  category: string
  productId: string
  limit?: number
  page: number
}) {
  await connectToDatabase()
  const skipAmount = (Number(page) - 1) * limit
  const conditions = {
    isPublished: true,
    category: new Types.ObjectId(category),
    _id: { $ne: productId },
  }
  const products = await ERPProductModel.find(conditions)
    .sort({ numSales: -1 })
    .skip(skipAmount)
    .limit(limit)
    .lean()
  const countProducts = await ERPProductModel.countDocuments(conditions)
  return {
    data: JSON.parse(JSON.stringify(products)) as IProductDoc[],
    totalPages: Math.ceil(countProducts / limit),
  }
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
// GET ALL TAGS
export async function getAllTags(): Promise<string[]> {
  await connectToDatabase()
  const tags = await ERPProductModel.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: null, uniqueTags: { $addToSet: '$tags' } } },
    { $project: { _id: 0, uniqueTags: 1 } },
  ])
  return (tags[0]?.uniqueTags || []) as string[]
}
// GET PRODUCTS DETAILS FOR CART
export async function getProductsDetailsForCart(
  productIds: string[]
): Promise<Record<string, IProductDoc>> {
  console.log(
    '[Server Action] getProductsDetailsForCart called for IDs:',
    productIds
  )
  if (!productIds?.length) return {}
  try {
    await connectToDatabase()
    const docs = await ERPProductModel.find({ _id: { $in: productIds } }).lean()
    const map: Record<string, IProductDoc> = {}
    docs.forEach((doc) => {
      const plain = JSON.parse(JSON.stringify(doc)) as IProductDoc
      map[plain._id.toString()] = plain
    })
    return map
  } catch (error) {
    console.error('Error fetching product details for cart:', error)
    return {}
  }
}
// GET ALL PRODUCTS FOR ADMIN
export async function getAllProductsForAdmin({
  query,
  page = 1,
  sort = 'latest',
  limit = ADMIN_PAGE_SIZE,
}: {
  query: string
  page?: number
  sort?: string
  limit?: number
}) {
  await connectToDatabase()

  const pageSize = limit || ADMIN_PAGE_SIZE
  const queryFilter =
    query && query !== 'all' ? { name: { $regex: query, $options: 'i' } } : {}

  const order: Record<string, 1 | -1> =
    sort === 'best-selling'
      ? { numSales: -1 }
      : sort === 'price-low-to-high'
        ? { price: 1 }
        : sort === 'price-high-to-low'
          ? { price: -1 }
          : sort === 'avg-customer-review'
            ? { avgRating: -1 }
            : { _id: -1 }

  const products = await ERPProductModel.find({ ...queryFilter })
    .populate('category')
    .populate('mainCategory')
    .populate('mainSupplier')
    .sort(order)
    .skip(pageSize * (Number(page) - 1))
    .limit(pageSize)
    .lean()

  const countProducts = await ERPProductModel.countDocuments({ ...queryFilter })

  return {
    products: JSON.parse(JSON.stringify(products)) as IProductDoc[],
    totalPages: Math.ceil(countProducts / pageSize),
    totalProducts: countProducts,
    from: pageSize * (Number(page) - 1) + 1,
    to: pageSize * (Number(page) - 1) + products.length,
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
