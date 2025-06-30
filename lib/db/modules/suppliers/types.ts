import type { Document } from 'mongoose'

export interface ISupplierDoc extends Document, ISupplierInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
export interface ISupplierInput {
  name: string
  contactName?: string
  email: string
  phone: string
  address: string
  fiscalCode: string
  bankAccount: string
  externalTransport?: boolean
  transportCosts: number
  loadingAddress: string
  productCatalog: string[]
  supplierDriver?: string
  externalTransportCosts?: number
  internalTransportCosts?: number
}
