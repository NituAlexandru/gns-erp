'use server'

import { connectToDatabase } from '@/lib/db'
import SupplierModel from './supplier.model'
import type { ISupplierDoc, ISupplierInput, ISupplierUpdate } from './types'
import { SupplierCreateSchema, SupplierUpdateSchema } from './validator'
import { ADMIN_PAGE_SIZE } from '@/lib/constants'
import { revalidatePath } from 'next/cache'
import { logAudit } from '../audit-logs/audit.actions'
import { FilterQuery } from 'mongoose'

export async function createSupplier(
  data: ISupplierInput,
  userId: string,
  userName: string,
  ip?: string,
  userAgent?: string,
) {
  const payload = SupplierCreateSchema.parse(data)
  await connectToDatabase()

  const supplierData = {
    ...payload,
    createdBy: {
      userId,
      name: userName,
    },
  }

  const newSupplier = await SupplierModel.create(supplierData)
  revalidatePath('/admin/management/suppliers')

  await logAudit(
    'Supplier',
    newSupplier._id,
    'create',
    userId,
    { after: newSupplier },
    ip,
    userAgent,
  )

  return { success: true, message: 'Furnizor creat cu succes' }
}

export async function updateSupplier(
  data: ISupplierUpdate,
  userId: string,
  userName: string,
  ip?: string,
  userAgent?: string,
) {
  const payload = SupplierUpdateSchema.parse(data)
  await connectToDatabase()

  const before = await SupplierModel.findById(payload._id).lean()

  const updateData = {
    ...payload,
    _id: undefined,
    updatedBy: {
      userId,
      name: userName,
    },
  }

  const updatedSupplier = await SupplierModel.findByIdAndUpdate(
    payload._id,
    updateData,
    { new: true },
  ).lean()

  if (!updatedSupplier) throw new Error('Furnizor inexistent')
  revalidatePath('/admin/management/suppliers')
  revalidatePath(`/admin/management/suppliers/${payload._id}`)

  await logAudit(
    'Supplier',
    payload._id,
    'update',
    userId,
    { before, after: updatedSupplier },
    ip,
    userAgent,
  )

  return { success: true, message: 'Furnizor actualizat cu succes' }
}

export async function deleteSupplier(
  id: string,
  userId: string,
  ip?: string,
  userAgent?: string,
) {
  await connectToDatabase()

  const before = await SupplierModel.findById(id).lean()
  if (!before) throw new Error('Furnizor inexistent')

  await SupplierModel.findByIdAndDelete(id)
  revalidatePath('/admin/management/suppliers')

  await logAudit('Supplier', id, 'delete', userId, { before }, ip, userAgent)

  return { success: true, message: 'Furnizor șters cu succes' }
}
export async function getSupplierById(id: string): Promise<ISupplierDoc> {
  await connectToDatabase()
  const doc = await SupplierModel.findById(id).lean()
  if (!doc) throw new Error('Supplier inexistent')
  return JSON.parse(JSON.stringify(doc)) as ISupplierDoc
}
// GET ALL FOR ADMIN (cu paginare)
export async function getAllSuppliersForAdmin({
  page = 1,
  limit = ADMIN_PAGE_SIZE,
  query = '',
}: {
  page?: number
  limit?: number
  query?: string // <--- Tip NOU
}) {
  await connectToDatabase()
  const skip = (page - 1) * limit

  // 1. Construim filtrul de căutare
  const filter: FilterQuery<typeof SupplierModel> = {}

  if (query) {
    const regex = new RegExp(query, 'i')
    filter.$or = [
      { name: regex },
      { fiscalCode: { $regex: query, $options: 'i' } },
      { email: regex },
      { phone: regex },
      { regComNumber: { $regex: query, $options: 'i' } },
    ]
  }

  // 2. Aplicăm filtrul la find și countDocuments
  const [data, total] = await Promise.all([
    SupplierModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SupplierModel.countDocuments(filter),
  ])

  return {
    data: JSON.parse(JSON.stringify(data)) as ISupplierDoc[],
    totalPages: Math.ceil(total / limit),
    total,
    from: skip + 1,
    to: skip + data.length,
  }
}

export async function getSupplierByCode(code: string) {
  await connectToDatabase()
  const supplier = await SupplierModel.findOne({
    $or: [{ fiscalCode: code }, { _id: code }],
  }).lean()

  if (!supplier) return null
  return JSON.parse(JSON.stringify(supplier)) as ISupplierDoc
}
