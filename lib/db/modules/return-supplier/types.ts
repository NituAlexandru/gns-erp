import type { Document } from 'mongoose'

export interface ReturnToSupplierProduct {
  product: string
  quantity: number
  reason: string
  priceAtReturn?: number | null
}

export interface IReturnToSupplierInput {
  returnType: 'supplier'
  supplier: string
  products: ReturnToSupplierProduct[]
  returnDate: Date
  status: 'Draft' | 'Final'
  originalOrder?: string
  originalInvoice?: string
}

export interface IReturnToSupplierDoc extends Document, IReturnToSupplierInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
