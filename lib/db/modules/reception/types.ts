import { z } from 'zod'
import {
  ReceptionCreateSchema,
  ReceptionPackagingSchema,
  ReceptionProductSchema,
  ReceptionUpdateSchema,
  DeliverySchema,
  InvoiceSchema,
} from './validator'

export type ReceptionProductInput = z.infer<typeof ReceptionProductSchema>
export type ReceptionCreateInput = z.infer<typeof ReceptionCreateSchema>
export type ReceptionUpdateInput = z.infer<typeof ReceptionUpdateSchema>

type PopulatedItem = {
  _id: string
  name: string
  unit?: string
}

export type PopulatedReceptionProduct = Omit<
  ReceptionProductInput,
  'product'
> & {
  product: PopulatedProductDetails
  distributedTransportCostPerUnit?: number
  totalDistributedTransportCost?: number
  landedCostPerUnit?: number
  vatValuePerUnit?: number
}

export type PopulatedReceptionPackaging = Omit<
  z.infer<typeof ReceptionPackagingSchema>,
  'packaging'
> & {
  packaging: PopulatedPackagingDetails
  distributedTransportCostPerUnit?: number
  totalDistributedTransportCost?: number
  landedCostPerUnit?: number
  vatValuePerUnit?: number
}

export type PopulatedReception = Omit<
  ReceptionUpdateInput,
  'products' | 'packagingItems' | 'supplier' | 'deliveries' | 'invoices'
> & {
  supplier?: PopulatedItem
  products?: PopulatedReceptionProduct[]
  createdBy: PopulatedItem
  createdAt: string
  packagingItems?: PopulatedReceptionPackaging[]
  deliveries?: z.infer<typeof DeliverySchema>[]
  invoices?: z.infer<typeof InvoiceSchema>[]
  amount: number
}

export interface ReceptionFilters {
  q?: string // text liber
  status?: string // "DRAFT", "CONFIRMAT" etc.
  createdBy?: string // ObjectId al utilizatorului
  page?: number
  pageSize: number
}
export type PopulatedProductDetails = {
  _id: string
  name: string
  unit?: string
  packagingUnit?: string
  packagingQuantity?: number
  itemsPerPallet?: number
}

export type PopulatedPackagingDetails = {
  _id: string
  name: string
  unit?: string
  packagingUnit?: string
  packagingQuantity?: number
}
