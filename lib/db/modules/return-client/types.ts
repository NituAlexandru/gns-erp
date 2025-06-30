import type { Document } from 'mongoose'

export interface ReturnFromClientProduct {
  product: string
  quantity: number
  reason: string
  priceAtReturn?: number | null
}

export interface IReturnFromClientInput {
  returnType: 'client'
  client: string
  products: ReturnFromClientProduct[]
  returnDate: Date
  status: 'Draft' | 'Final'
  originalOrder?: string
  originalInvoice?: string
}

export interface IReturnClientDoc extends Document, IReturnFromClientInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
