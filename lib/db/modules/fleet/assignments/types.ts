import { z } from 'zod'
import type { Document } from 'mongoose'
import { AssignmentCreateSchema } from './validator'

export type IAssignmentInput = z.infer<typeof AssignmentCreateSchema>

export interface IAssignmentDoc extends Document, IAssignmentInput {
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
