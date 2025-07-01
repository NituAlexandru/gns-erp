import { z } from 'zod'

export const PriceEventSchema = z.object({
  product: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID'),
  productName: z.string().min(1),
  eventType: z.enum(['PURCHASE', 'SALE']),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  total: z.number().nonnegative(),
  referenceId: z.string().optional(),
  timestamp: z
    .date()
    .optional()
    .default(() => new Date()),
})

export type PriceEventInput = z.infer<typeof PriceEventSchema>
