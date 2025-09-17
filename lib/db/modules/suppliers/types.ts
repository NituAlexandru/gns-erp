import type { Document } from 'mongoose'
import { z } from 'zod'
import { SupplierCreateSchema, SupplierUpdateSchema } from './validator'
import {
  AddressSchema,
  BankAccountSchema,
} from '@/lib/db/modules/client/validator'

export type IAddress = z.infer<typeof AddressSchema>
export type IBankAccount = z.infer<typeof BankAccountSchema>

export type ISupplierInput = z.infer<typeof SupplierCreateSchema>
export type ISupplierUpdate = z.infer<typeof SupplierUpdateSchema>

export interface ISupplierDoc extends Document, ISupplierInput {
  _id: string
  createdBy: {
    userId: string
    name: string
  }
  updatedBy?: {
    userId: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}
