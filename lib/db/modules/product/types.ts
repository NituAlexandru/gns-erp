import { z } from 'zod'
import { ProductInputSchema, ProductUpdateSchema } from './validator'
import { ClientMarkup } from '@/types'

export type IProductInput = z.infer<typeof ProductInputSchema>
export type IProductUpdate = z.infer<typeof ProductUpdateSchema>

export interface IProductDoc extends IProductInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
export interface IERPProductInput {
  name: string
  slug: string
  category: string // ObjectId categoria
  barCode: string
  productCode: string
  images?: string[]
  description?: string
  mainSupplier: string // ObjectId furnizor
  directDeliveryPrice: number
  fullTruckPrice: number
  smallDeliveryBusinessPrice: number
  retailPrice: number
  minStock?: number
  currentStock?: number
  firstOrderDate?: Date
  lastOrderDate?: Date
  numSales?: number
  averagePurchasePrice: number
  defaultMarkups?: {
    markupDirectDeliveryPrice?: number
    markupFullTruckPrice?: number
    markupSmallDeliveryBusinessPrice?: number
    markupRetailPrice?: number
  }
  clientMarkups?: ClientMarkup[]
  unit: string
  packagingUnit?: string
  packagingQuantity?: number
  length: number
  width: number
  height: number
  volume: number
  weight: number
  specifications: string[]
  palletTypeId?: string
  itemsPerPallet?: number
  isActive?: boolean
}