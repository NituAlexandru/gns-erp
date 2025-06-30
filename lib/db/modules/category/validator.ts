import { MongoId } from "@/lib/validator"
import { z } from "zod"

// 1. Schema pentru crearea unei categorii
export const CategoryInputSchema = z.object({
  name: z.string().min(1, 'Numele categoriei este obligatoriu'),
  slug: z
    .string()
    .min(1, 'Slug-ul categoriei este obligatoriu')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug-ul poate conține doar litere mici, cifre și cratime'
    ),
  mainCategory: MongoId.optional(),
})

// 2. Schema pentru actualizare (include şi _id)
export const CategoryUpdateSchema = CategoryInputSchema.extend({
  _id: MongoId,
})

// 3. Tipuri inferrate
export type ICategoryInput = z.infer<typeof CategoryInputSchema>
export type ICategoryUpdate = z.infer<typeof CategoryUpdateSchema>
