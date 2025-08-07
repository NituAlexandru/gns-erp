import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const VatRateCreateSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă cel puțin 3 caractere.'),
  rate: z.coerce.number().min(0, 'Cota trebuie să fie un număr pozitiv.'),
  isActive: z.boolean().optional().default(true),
})

export const VatRateUpdateSchema = VatRateCreateSchema.extend({
  _id: MongoId,
})

export const SetDefaultVatRateSchema = z.object({
  rateId: MongoId,
  userId: MongoId,
})
