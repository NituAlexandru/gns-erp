'use server'

import { connectToDatabase } from '@/lib/db'
import SupplierModel from './supplier.model'
import type { ISupplierDoc, ISupplierInput } from './types'
import { SupplierCreateSchema, SupplierUpdateSchema } from './validator'
import { ADMIN_PAGE_SIZE } from '@/lib/constants'

export async function createSupplier(data: ISupplierInput) {
  const payload = SupplierCreateSchema.parse(data)
  await connectToDatabase()
  await SupplierModel.create(payload)
  return { success: true, message: 'Supplier creat cu succes' }
}

export async function updateSupplier(data: ISupplierInput & { _id: string }) {
  const payload = SupplierUpdateSchema.parse(data)
  await connectToDatabase()
  await SupplierModel.findByIdAndUpdate(payload._id, payload)
  return { success: true, message: 'Supplier actualizat cu succes' }
}

export async function getSupplierById(id: string): Promise<ISupplierDoc> {
  await connectToDatabase()
  const doc = await SupplierModel.findById(id).lean()
  if (!doc) throw new Error('Supplier inexistent')
  return JSON.parse(JSON.stringify(doc)) as ISupplierDoc
}
// DELETE
export async function deleteSupplier(id: string) {
  await connectToDatabase()
  const res = await SupplierModel.findByIdAndDelete(id)
  if (!res) throw new Error('Supplier inexistent')
  return { success: true, message: 'Supplier șters cu succes' }
}

// GET ALL FOR ADMIN (cu paginare)
export async function getAllSuppliersForAdmin({
  page = 1,
  limit = ADMIN_PAGE_SIZE,
}: {
  page?: number
  limit?: number
}) {
  await connectToDatabase()
  const skip = (page - 1) * limit
  const total = await SupplierModel.countDocuments()
  const data = await SupplierModel.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
  return {
    data: JSON.parse(JSON.stringify(data)) as ISupplierDoc[],
    totalPages: Math.ceil(total / limit),
    total,
    from: skip + 1,
    to: skip + data.length,
  }
}
