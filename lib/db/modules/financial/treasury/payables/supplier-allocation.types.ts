import { Types } from 'mongoose'
import { z } from 'zod'
import { CreateSupplierAllocationSchema } from './supplier-allocation.validator'

// 1. Tipul de bază Mongoose (pentru document)
export interface ISupplierAllocationDoc extends Document {
  _id: Types.ObjectId
  paymentId: Types.ObjectId // Ref la SupplierPayment
  invoiceId: Types.ObjectId // Ref la SupplierInvoice
  amountAllocated: number
  allocationDate: Date
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

// 2. Tipul DTO (ce trimitem la client/UI)
export interface SupplierAllocationDTO {
  _id: string
  paymentId: string
  invoiceId: string
  amountAllocated: number
  allocationDate: string // ISO Date
  createdByName: string
}

// 3. Tipul de Input (din Zod, pentru acțiuni)
export type CreateSupplierAllocationInput = z.infer<
  typeof CreateSupplierAllocationSchema
>
