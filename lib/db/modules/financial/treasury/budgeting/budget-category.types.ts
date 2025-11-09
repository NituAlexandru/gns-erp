import { Types } from 'mongoose'
import { z } from 'zod'
import { CreateBudgetCategorySchema } from './budget-category.validator'

// 1. Tipul de bază Mongoose (pentru document)
export interface IBudgetCategoryDoc extends Document {
  _id: Types.ObjectId
  name: string
  description?: string

  // Relația Părinte-Copil
  parentId: Types.ObjectId | null // null = Categorie Principală

  // Audit
  createdBy: Types.ObjectId
  createdByName: string

  createdAt: Date
  updatedAt: Date
}

// 2. Tipul DTO (ce trimitem la client/UI)
export interface BudgetCategoryDTO {
  _id: string
  name: string
  description?: string
  parentId: string | null
}

// 3. Tipul de Input (din Zod, pentru formulare)
export type CreateBudgetCategoryInput = z.infer<
  typeof CreateBudgetCategorySchema
>
