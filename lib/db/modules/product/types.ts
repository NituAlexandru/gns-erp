import { z } from 'zod'
import { ProductInputSchema, ProductUpdateSchema } from './validator'
import { IERPProductDoc } from './product.model'

export type IProductInput = z.infer<typeof ProductInputSchema>
export type IProductUpdate = z.infer<typeof ProductUpdateSchema>
export type IProductDoc = IProductInput & {
  _id: string
  createdAt: Date
  updatedAt: Date
  category: string | IPopulatedCategory
  mainCategory: string | IPopulatedCategory
  isPublished: boolean
}
export type PopulatedProduct = IERPProductDoc & {
  category: IPopulatedCategory
  mainCategory: IPopulatedCategory
}
export type AdminProductDoc = IProductDoc & {
  defaultMarkups: {
    markupDirectDeliveryPrice: number
    markupFullTruckPrice: number
    markupSmallDeliveryBusinessPrice: number
    markupRetailPrice: number
  }
  image: string
  barCode: string
  isPublished: boolean
}

export interface IPopulatedCategory {
  _id: string
  name: string
  slug: string
}
export interface MarkupPatch {
  markupDirectDeliveryPrice?: number
  markupFullTruckPrice?: number
  markupSmallDeliveryBusinessPrice?: number
  markupRetailPrice?: number
}
export interface AdminProductSearchResult {
  _id: string
  name: string
  productCode: string
  averagePurchasePrice: number
  defaultMarkups: {
    markupDirectDeliveryPrice: number
    markupFullTruckPrice: number
    markupSmallDeliveryBusinessPrice: number
    markupRetailPrice: number
  }
  image: string | null
  category: string | null
  barCode: string | null
  isPublished: boolean
}
