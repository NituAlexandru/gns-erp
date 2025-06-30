import { z } from 'zod'
import { DELIVERY_STATUSES } from './constants'

const MongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID MongoDB invalid')

export const DeliveryCreateSchema = z.object({
  order: MongoId,
  driver: MongoId.optional(),
  vehicle: MongoId.optional(),
  carNumber: z.string(),
  deliveryDate: z.preprocess(
    (d) => (typeof d === 'string' ? new Date(d) : d),
    z.date().optional()
  ),
  client: z.string().min(1, 'Client obligatoriu'),
  status: z.enum(DELIVERY_STATUSES).default('In curs'),
  notes: z.string().optional(),
})

// 2) Schema pentru update (include _id)
export const DeliveryUpdateSchema = DeliveryCreateSchema.extend({
  _id: MongoId,
})

// 3) Tipuri inferrate
export type DeliveryCreateInput = z.infer<typeof DeliveryCreateSchema>
export type DeliveryUpdateInput = z.infer<typeof DeliveryUpdateSchema>
