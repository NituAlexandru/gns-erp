import type { Document } from 'mongoose'
import { z } from 'zod'
import { SupplierCreateSchema, SupplierUpdateSchema } from './validator'

export type ISupplierInput = z.infer<typeof SupplierCreateSchema>
export type ISupplierUpdate = z.infer<typeof SupplierUpdateSchema>

export interface ISupplierDoc extends Document, ISupplierInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
