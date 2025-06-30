import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const ReturnFromClientProductSchema = z.object({
  product: MongoId,
  quantity: z.number().int().positive(),
  reason: z.string().min(1),
  priceAtReturn: z.number().nonnegative().nullable().optional(),
})

export const ReturnFromClientCreateSchema = z.object({
  returnType: z.literal('client').default('client'),
  client: MongoId,
  products: z.array(ReturnFromClientProductSchema).min(1),
  returnDate: z.date().default(() => new Date()),
  status: z.enum(['Draft', 'Final']).default('Draft'),
  originalOrder: MongoId.optional(),
  originalInvoice: MongoId.optional(),
})

export const ReturnFromClientUpdateSchema = ReturnFromClientCreateSchema.extend(
  {
    _id: MongoId,
  }
)
