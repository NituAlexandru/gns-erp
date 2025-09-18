import { z } from 'zod'
import type { Document } from 'mongoose'
import { DriverCreateSchema } from './validator'


export type IDriverInput = z.infer<typeof DriverCreateSchema>

export interface IDriverDoc extends Document, IDriverInput {
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
