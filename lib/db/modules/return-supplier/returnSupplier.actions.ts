'use server'

import { connectToDatabase } from '@/lib/db'
import ReturnSupplierModel from './returnSupplier.model'
import type { IReturnToSupplierInput } from './types'
import {
  ReturnSupplierCreateSchema,
  ReturnSupplierUpdateSchema,
} from './validator'

type ReturnSupplierDTO = IReturnToSupplierInput & {
  _id: string
  createdAt: string
  updatedAt: string
}

export async function createReturnToSupplier(data: IReturnToSupplierInput) {
  const payload = ReturnSupplierCreateSchema.parse(data)
  await connectToDatabase()
  await ReturnSupplierModel.create(payload)
  return { success: true, message: 'Return furnizor creat cu succes' }
}

export async function updateReturnToSupplier(
  data: IReturnToSupplierInput & { _id: string }
) {
  const payload = ReturnSupplierUpdateSchema.parse(data)
  await connectToDatabase()
  await ReturnSupplierModel.findByIdAndUpdate(payload._id, payload)
  return { success: true, message: 'Return furnizor actualizat cu succes' }
}

export async function getReturnToSupplierById(
  id: string
): Promise<ReturnSupplierDTO> {
  await connectToDatabase()
  const doc = await ReturnSupplierModel.findById(id).lean()
  if (!doc) throw new Error('Return furnizor inexistent')
  // În loc de `as any`, aruncăm direct la tipul nostru concret
  return JSON.parse(JSON.stringify(doc)) as ReturnSupplierDTO
}
