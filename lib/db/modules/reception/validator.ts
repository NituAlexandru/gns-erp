import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const ReceptionProductSchema = z.object({
  product: MongoId,
  quantity: z.number().int().positive(),
  unitMeasure: z.string().min(1),
  priceAtReception: z.number().nonnegative().nullable().optional(),
})

export const ReceptionCreateSchema = z.object({
  createdBy: MongoId,
  supplier: MongoId,
  products: z.array(ReceptionProductSchema).min(1),
  receptionDate: z.date().default(() => new Date()),
  driverName: z.string().optional(),
  carNumber: z.string().optional(),
  status: z.enum(['Draft', 'Final']).default('Draft'),
})

export const ReceptionUpdateSchema = ReceptionCreateSchema.extend({
  _id: MongoId,
})
