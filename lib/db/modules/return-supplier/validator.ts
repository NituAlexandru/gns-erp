import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const ReturnToSupplierProductSchema = z.object({
  product: MongoId,
  quantity: z.number().int().positive(),
  reason: z.string().min(1),
  priceAtReturn: z.number().nonnegative().nullable().optional(),
})

export const ReturnSupplierCreateSchema = z.object({
  returnType: z.literal('supplier').default('supplier'),
  supplier: MongoId,
  products: z.array(ReturnToSupplierProductSchema).min(1),
  returnDate: z.date().default(() => new Date()),
  status: z.enum(['Draft', 'Final']).default('Draft'),
  originalOrder: MongoId.optional(),
  originalInvoice: MongoId.optional(),
})

export const ReturnSupplierUpdateSchema = ReturnSupplierCreateSchema.extend({
  _id: MongoId,
})
