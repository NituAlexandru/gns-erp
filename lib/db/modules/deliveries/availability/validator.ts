import { z } from 'zod'
import { MongoId } from '@/lib/validator'
import { DELIVERY_SLOTS } from '../constants'

export const CreateBlockSchema = z.object({
  assignmentId: MongoId,
  date: z.date(),
  slots: z
    .array(z.enum(DELIVERY_SLOTS))
    .min(1, 'Selectează cel puțin un interval.'),
  type: z.enum(['ITP', 'SERVICE', 'CONCEDIU', 'ALTELE']),
  note: z.string().optional(),
})

export type CreateBlockInput = z.infer<typeof CreateBlockSchema>
