import { z } from 'zod'
import {
  ReceptionCreateSchema,
  ReceptionPackagingSchema,
  ReceptionProductSchema,
  ReceptionUpdateSchema,
  DeliverySchema,
  InvoiceSchema,
} from './validator'

export interface IQualityDetails {
  lotNumbers?: string[]
  certificateNumbers?: string[]
  testReports?: string[]
  additionalNotes?: string
}

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
  productName?: string
  productCode?: string
  distributedTransportCostPerUnit?: number
  totalDistributedTransportCost?: number
  landedCostPerUnit?: number
  vatValuePerUnit?: number
  qualityDetails?: IQualityDetails
}

export type PopulatedReceptionPackaging = Omit<
  z.infer<typeof ReceptionPackagingSchema>,
  'packaging'
> & {
  packaging: PopulatedPackagingDetails
  packagingName?: string
  productCode?: string
  distributedTransportCostPerUnit?: number
  totalDistributedTransportCost?: number
  landedCostPerUnit?: number
  vatValuePerUnit?: number
  qualityDetails?: IQualityDetails
}

export type PopulatedReception = Omit<
  ReceptionUpdateInput,
  'products' | 'packagingItems' | 'supplier' | 'deliveries' | 'invoices'
> & {
  supplier?: PopulatedItem
  products?: PopulatedReceptionProduct[]
  createdBy: PopulatedItem
  createdByName?: string
  createdAt: string
  packagingItems?: PopulatedReceptionPackaging[]
  deliveries?: z.infer<typeof DeliverySchema>[]
  invoices?: z.infer<typeof InvoiceSchema>[]
  amount: number
  supplierSnapshot?: {
    name: string
    cui?: string
    regCom?: string
    address?: string
  }
}

export interface ReceptionFilters {
  q?: string // text liber
  status?: string // "DRAFT", "CONFIRMAT" etc.
  createdBy?: string
  page: number
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
