import { z } from 'zod'
import {
  AddressSchema,
  ClientCreateSchema,
  ClientUpdateSchema,
} from './validator'

export type IAddress = z.infer<typeof AddressSchema>

export type IClientCreate = z.infer<typeof ClientCreateSchema>
export type IClientUpdate = z.infer<typeof ClientUpdateSchema>

import type { Document } from 'mongoose'
export interface IClientDoc extends Document, IClientCreate {
  _id: string
  createdBy: {
    userId: string
    name: string
  }
  updatedBy?: {
    userId: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}
