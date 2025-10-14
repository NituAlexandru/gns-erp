import { z } from 'zod'
import { packagingZod } from './validator'

export type IPackagingInput = z.infer<typeof packagingZod>
export type IPackagingUpdate = IPackagingInput & { _id: string }

export interface IPackagingDoc extends IPackagingInput {
  _id: string
  createdAt: Date
  updatedAt: Date
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
