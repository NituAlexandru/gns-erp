import { z } from 'zod'
import { CategoryInputSchema } from './validator'

export type ICategoryCreate = z.infer<typeof CategoryInputSchema>

export interface ICategoryDoc {
  _id: string
  name: string
  slug: string
  mainCategory?: {
    _id: string
    name: string
  }
  mainCategorySlug?: string
  createdAt: string
  updatedAt: string
}
