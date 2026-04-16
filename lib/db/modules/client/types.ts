import { z } from 'zod'
import {
  AddressSchema,
  ClientCreateSchema,
  ClientUpdateSchema,
} from './validator'

export type IAddress = z.infer<typeof AddressSchema>

export type IClientCreate = z.infer<typeof ClientCreateSchema>
export type IClientUpdate = z.infer<typeof ClientUpdateSchema>

import type { Document, Types } from 'mongoose'
export interface IClientDoc
  extends Document,
    Omit<
      IClientCreate,
      'activeContractId' | 'isErpCreatedContract' | 'addendums'
    > {
  _id: string
  createdBy: {
    userId: string
    name: string
  }
  updatedBy?: {
    userId: string
    name: string
  }
  isErpCreatedContract: boolean
  activeContractId?: Types.ObjectId | string
  addendums?: {
    number: string
    date: Date
    contractId: Types.ObjectId | string
  }[]
  createdAt: Date
  updatedAt: Date
}
