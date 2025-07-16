'use server'

import { connectToDatabase } from '@/lib/db'
import PackagingModel from './packaging.model'
import { revalidatePath } from 'next/cache'
import { formatError } from '@/lib/utils'
import { IPackagingDoc, IPackagingInput, IPackagingUpdate } from './types'
import { packagingUpdateZod, packagingZod } from './validator'
import { ADMIN_PAGE_SIZE } from '@/lib/constants'
import { PRODUCT_PAGE_SIZE } from '../product/constants'
import { Types } from 'mongoose'
import { CategoryModel } from '../category'

export async function getAllPackagings({
  query,
  category,
  mainCategory,
  price,
  page = 1,
  limit,
}: {
  query: string
  category: string
  mainCategory: string
  price?: string
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
      categoryFilter = { mainCategory: new Types.ObjectId(category) }
    } else {
      const catDoc = await CategoryModel.findOne({ slug: category })
        .select('_id')
        .lean()
      if (catDoc) {
        categoryFilter = { mainCategory: catDoc._id }
      } else {
        return {
          packagings: [],
          totalPages: 0,
          totalPackagings: 0,
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
          packagings: [],
          totalPages: 0,
          totalPackagings: 0,
          from: 0,
          to: 0,
        }
      }
    }
  }
  const priceFilter =
    price && price !== 'all'
      ? {
          price: {
            $gte: Number(price.split('-')[0]),
            $lte: Number(price.split('-')[1]),
          },
        }
      : {}

  const packagings = await PackagingModel.find({
    isPublished: true,
    ...queryFilter,
    ...categoryFilter,
    ...mainCategoryFilter,
    ...priceFilter,
  })
    .sort({ _id: -1 })
    .skip(skipAmount)
    .limit(limit)
    .populate('mainCategory', '_id name slug')
    .lean()

  const countPackagings = await PackagingModel.countDocuments({
    isPublished: true,
    ...queryFilter,
    ...categoryFilter,
    ...mainCategoryFilter,
    ...priceFilter,
  })

  return {
    packagings: JSON.parse(JSON.stringify(packagings)) as IPackagingDoc[],
    totalPages: Math.ceil(countPackagings / limit),
    totalPackagings: countPackagings,
    from: skipAmount + 1,
    to: skipAmount + packagings.length,
  }
}

// CREATE
export async function createPackaging(data: IPackagingInput) {
  try {
    const payload = packagingZod.parse(data)
    await connectToDatabase()
    await PackagingModel.create(payload)
    revalidatePath('/admin/packagings')
    return { success: true, message: 'Packaging created successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// UPDATE
export async function updatePackaging(data: IPackagingUpdate) {
  try {
    const payload = packagingUpdateZod.parse(data)
    await connectToDatabase()
    await PackagingModel.findByIdAndUpdate(payload._id, payload)
    revalidatePath('/admin/packagings')
    return { success: true, message: 'Packaging updated successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// GET ONE BY ID
export async function getPackagingById(id: string): Promise<IPackagingDoc> {
  await connectToDatabase()
  const doc = await PackagingModel.findById(id).lean()
  if (!doc) throw new Error('Packaging not found')
  return JSON.parse(JSON.stringify(doc)) as IPackagingDoc
}

// DELETE
export async function deletePackaging(id: string) {
  try {
    await connectToDatabase()
    const res = await PackagingModel.findByIdAndDelete(id)
    if (!res) throw new Error('Packaging not found')
    revalidatePath('/admin/packagings')
    return { success: true, message: 'Packaging deleted successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// GET ALL FOR ADMIN
export async function getAllPackagingsForAdmin({
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
    sort === 'price-low-to-high'
      ? { price: 1 }
      : sort === 'price-high-to-low'
        ? { price: -1 }
        : { _id: -1 }

  const packagings = await PackagingModel.find({ ...queryFilter })
    .sort(order)
    .skip(pageSize * (Number(page) - 1))
    .limit(pageSize)
    .lean()

  const countPackagings = await PackagingModel.countDocuments({
    ...queryFilter,
  })

  return {
    packagings: JSON.parse(JSON.stringify(packagings)) as IPackagingDoc[],
    totalPages: Math.ceil(countPackagings / pageSize),
    totalPackagings: countPackagings,
    from: pageSize * (Number(page) - 1) + 1,
    to: pageSize * (Number(page) - 1) + packagings.length,
  }
}
