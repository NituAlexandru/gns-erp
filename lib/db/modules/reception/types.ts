import { Document } from 'mongoose'

export interface ReceptionProduct {
  product: string // ObjectId produs
  quantity: number
  unitMeasure: string
  priceAtReception?: number | null
}

export interface IReceptionInput {
  createdBy: string // ObjectId user
  supplier: string // ObjectId supplier
  products: ReceptionProduct[]
  receptionDate: Date
  driverName?: string
  carNumber?: string
  status: 'Draft' | 'Final'
}

export interface IReceptionDoc extends Document, IReceptionInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
