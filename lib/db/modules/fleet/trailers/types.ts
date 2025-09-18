import { z } from 'zod'
import type { Document } from 'mongoose'
import { TrailerCreateSchema } from './validator'

export type ITrailerInput = z.infer<typeof TrailerCreateSchema>

export interface ITrailerDoc extends Document, ITrailerInput {
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
