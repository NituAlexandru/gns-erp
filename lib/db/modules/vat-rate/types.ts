import type { Document } from 'mongoose'

export interface IVatRateInput {
  vatRate: number // ex: 0.19 pentru 19%
}

export interface IVatRateDoc extends Document, IVatRateInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
