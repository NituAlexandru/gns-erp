import { Types, Document } from 'mongoose'
import { z } from 'zod'
import { ISupplierDoc } from '../../../suppliers/types'
import { SupplierPaymentPayloadSchema } from './supplier-payment.validator'
import { SupplierPaymentStatus } from './supplier-payment.constants'
import { BudgetCategoryDTO } from '../budgeting/budget-category.types'

// --- Definim tipul pentru Snapshot ---
export type BudgetCategorySnapshot = {
  mainCategoryId: Types.ObjectId
  mainCategoryName: string
  subCategoryId?: Types.ObjectId
  subCategoryName?: string
}

// 1. Tipul de bază Mongoose (pentru document)
export interface ISupplierPaymentDoc extends Document {
  _id: Types.ObjectId
  paymentNumber: string | null // Opțional
  seriesName: string | null // Opțional
  sequenceNumber: number | null // Opțional

  supplierId: Types.ObjectId | ISupplierDoc
  paymentDate: Date
  paymentMethod: string

  totalAmount: number
  unallocatedAmount: number

  referenceDocument?: string
  notes?: string
  status: SupplierPaymentStatus

  currency: string
  exchangeRate: number
  originalCurrencyAmount?: number
  budgetCategorySnapshot?: BudgetCategorySnapshot

  createdBy: Types.ObjectId
  createdByName: string

  createdAt: Date
  updatedAt: Date
}

// 2. Tipul DTO (ce trimitem la client/UI)
export interface SupplierPaymentDTO {
  _id: string
  paymentNumber: string | null
  seriesName: string | null
  sequenceNumber: number | null
  supplierId: string
  supplierName?: string
  paymentDate: string
  paymentMethod: string
  totalAmount: number
  currency: string
  exchangeRate: number
  originalCurrencyAmount?: number
  unallocatedAmount: number
  referenceDocument?: string
  notes?: string
  status: SupplierPaymentStatus
  createdByName: string
  createdAt: string
  budgetCategorySnapshot?: BudgetCategorySnapshot
}

// 3. Tipul de Input (din Zod, pentru formularul de payload)
export type CreateSupplierPaymentInput = z.infer<
  typeof SupplierPaymentPayloadSchema
>
export interface IBudgetCategoryTree extends BudgetCategoryDTO {
  children: IBudgetCategoryTree[]
}
