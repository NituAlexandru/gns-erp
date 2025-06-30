'use server'

import { connectToDatabase } from '@/lib/db'
import SupplierModel from './supplier.model'
import type { ISupplierDoc, ISupplierInput } from './types'
import { SupplierCreateSchema, SupplierUpdateSchema } from './validator'

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

// aici folosim doar ISupplierDoc pentru tipul returnat
export async function getSupplierById(id: string): Promise<ISupplierDoc> {
  await connectToDatabase()
  const doc = await SupplierModel.findById(id).lean()
  if (!doc) throw new Error('Supplier inexistent')
  return JSON.parse(JSON.stringify(doc)) as ISupplierDoc
}
