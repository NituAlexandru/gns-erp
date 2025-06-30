import { z } from 'zod'

const MongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID MongoDB invalid')

const DefaultMarkupsSchema = z.object({
  directDeliveryPrice: z.number().nonnegative(),
  fullTruckPrice: z.number().nonnegative(),
  smallDeliveryBusinessPrice: z.number().nonnegative(),
  retailPrice: z.number().nonnegative(),
})

export const MarkupHistoryCreateSchema = z.object({
  product: MongoId,
  defaultMarkups: DefaultMarkupsSchema,
  effectiveDate: z.preprocess(
    (d) => (typeof d === 'string' ? new Date(d) : d),
    z.date().optional()
  ),
})

// pentru update (include _id)
export const MarkupHistoryUpdateSchema = MarkupHistoryCreateSchema.extend({
  _id: MongoId,
})

export type MarkupHistoryCreateInput = z.infer<typeof MarkupHistoryCreateSchema>
export type MarkupHistoryUpdateInput = z.infer<typeof MarkupHistoryUpdateSchema>
