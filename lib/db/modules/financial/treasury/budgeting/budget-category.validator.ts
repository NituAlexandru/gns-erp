import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const CreateBudgetCategorySchema = z.object({
  name: z.string().min(2, 'Numele categoriei este obligatoriu.'),
  description: z.string().optional(),
  parentId: MongoId.nullable().optional(),
})

export const UpdateBudgetCategorySchema = CreateBudgetCategorySchema.extend({
  _id: MongoId,
})
