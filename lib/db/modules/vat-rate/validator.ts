import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const VatRateCreateSchema = z.object({
  vatRate: z
    .number()
    .min(0, 'Cota TVA nu poate fi negativă')
    .max(1, 'Cota TVA nu poate depăși 1 (100%)'),
})

export const VatRateUpdateSchema = VatRateCreateSchema.extend({
  _id: MongoId,
})
