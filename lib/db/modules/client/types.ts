import { z } from 'zod'
import { ClientCreateSchema, ClientUpdateSchema } from './validator'

export type IClientCreate = z.infer<typeof ClientCreateSchema>
export type IClientUpdate = z.infer<typeof ClientUpdateSchema>

import type { Document } from 'mongoose'
export interface IClientDoc extends Document, IClientCreate {
  _id: string
  createdAt: Date
  updatedAt: Date
}
