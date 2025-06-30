import { z } from 'zod'
import { CategoryInputSchema } from './validator'

// tipul de „create” (ce intră în createCategory)
export type ICategoryCreate = z.infer<typeof CategoryInputSchema>

//  tipul de document returnat de Mongo + lean (transformat în JSON)
export interface ICategoryDoc extends z.infer<typeof CategoryInputSchema> {
  _id: string
  createdAt: string
  updatedAt: string
}
