import { z } from 'zod'
import { connectToDatabase } from '@/lib/db'
import { formatError } from '@/lib/utils'

import { ADMIN_PAGE_SIZE } from '@/lib/constants'
import { CategoryInputSchema, CategoryUpdateSchema } from './validator'
import CategoryModel from './category.model'

// 1) CREATE
export async function createCategory(
  data: z.infer<typeof CategoryInputSchema>
) {
  try {
    const payload = CategoryInputSchema.parse(data)
    await connectToDatabase()
    await CategoryModel.create(payload)
    return { success: true, message: 'Category created successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// 2) UPDATE
export async function updateCategory(
  data: z.infer<typeof CategoryUpdateSchema>
) {
  try {
    const payload = CategoryUpdateSchema.parse(data)
    await connectToDatabase()
    await CategoryModel.findByIdAndUpdate(payload._id, payload)
    return { success: true, message: 'Category updated successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// 3) DELETE
export async function deleteCategory(id: string) {
  try {
    await connectToDatabase()
    const res = await CategoryModel.findByIdAndDelete(id)
    if (!res) throw new Error('Category not found')
    return { success: true, message: 'Category deleted successfully' }
  } catch (error) {
    return { success: false, message: formatError(error) }
  }
}

// 4) GET ONE
export async function getCategoryById(id: string) {
  await connectToDatabase()
  const doc = await CategoryModel.findById(id).lean()
  if (!doc) throw new Error('Category not found')
  return JSON.parse(JSON.stringify(doc)) /* → tipat ca ICategoryDoc */
}

// 5) GET ALL FOR ADMIN (cu paginare)
export async function getAllCategoriesForAdmin({
  page = 1,
  limit = ADMIN_PAGE_SIZE,
}: {
  page?: number
  limit?: number
}) {
  await connectToDatabase()

  const skipAmount = (page - 1) * limit
  const total = await CategoryModel.countDocuments()

  const data = await CategoryModel.find()
    .populate('mainCategory', 'name')
    .sort({ createdAt: -1 })
    .skip(skipAmount)
    .limit(limit)
    .lean()

  return {
    data: JSON.parse(JSON.stringify(data)),
    totalPages: Math.ceil(total / limit),
    total,
    from: skipAmount + 1,
    to: skipAmount + data.length,
  }
}

// 6) GET ALL SIMPLE (fără paginare)
export async function getAllCategories() {
  await connectToDatabase()
  const docs = await CategoryModel.find().lean()
  return JSON.parse(JSON.stringify(docs))
}

// 7) GET MAIN CATEGORIES
export async function getMainCategories() {
  await connectToDatabase()
  // Căutăm toate documentele unde câmpul 'mainCategory' nu există sau este null
  const docs = await CategoryModel.find({ mainCategory: { $exists: false } })
    .sort({ name: 1 })
    .lean()
  return JSON.parse(JSON.stringify(docs))
}

// 8) GET ALL SUB-CATEGORIES (Doar cele care au părinte, fără paginare)
export async function getAllSubCategories() {
  await connectToDatabase()
  // Căutăm categoriile care au câmpul mainCategory completat
  const docs = await CategoryModel.find({
    mainCategory: { $exists: true, $ne: null },
  })
    .sort({ name: 1 })
    .lean()
  return JSON.parse(JSON.stringify(docs))
}
