import { z } from 'zod'
import { packagingZod } from './validator'

export type IPackagingInput = z.infer<typeof packagingZod>
export type IPackagingUpdate = IPackagingInput & { _id: string }

export interface IPackagingDoc extends IPackagingInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}
