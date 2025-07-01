import { MongoId } from '@/lib/validator'
import { z } from 'zod'

export const CategoryInputSchema = z.object({
  name: z.string().min(1, 'Numele categoriei este obligatoriu'),
  slug: z
    .string()
    .min(1, 'Slug-ul categoriei este obligatoriu')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug-ul poate conține doar litere mici, cifre și cratime'
    ),
  mainCategory: z.preprocess(
    (val) => (val === '!' || val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  mainCategorySlug: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug-ul poate conține doar litere mici, cifre și cratime'
      )
      .optional()
  ),
})

export const CategoryUpdateSchema = CategoryInputSchema.extend({
  _id: MongoId,
})

export type ICategoryInput = z.infer<typeof CategoryInputSchema>
export type ICategoryUpdate = z.infer<typeof CategoryUpdateSchema>
