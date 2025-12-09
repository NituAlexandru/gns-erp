import { z } from 'zod'
import { packagingZod } from './validator'
import { IPackagingDoc as IPackagingDocModel } from './packaging.model'

export type IPackagingInput = z.infer<typeof packagingZod>
export type IPackagingUpdate = IPackagingInput & { _id: string }
export type IPackagingDoc = IPackagingDocModel

// PENTRU UI:
export interface PopulatedPackagingSupplier {
  supplier: {
    _id: string
    name: string
  }
  supplierProductCode?: string
  lastPurchasePrice?: number
  isMain?: boolean
  updatedAt: Date
}

export type PopulatedPackaging = Omit<IPackagingDoc, 'suppliers'> & {
  suppliers: PopulatedPackagingSupplier[]
}

export type PackagingForOrderLine = {
  _id: string
  name: string
  productCode: string
  unit: string
  packagingOptions?: []
  weight?: number
  volume?: number
  length?: number
  width?: number
  height?: number
  packagingUnit?: string
  packagingQuantity?: number
}
