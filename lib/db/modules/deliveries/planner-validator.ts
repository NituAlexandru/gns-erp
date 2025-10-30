import { z } from 'zod'
import { DELIVERY_SLOTS } from './constants'

export const ScheduleDeliverySchema = z.object({
  deliveryDate: z.date({
    required_error: 'Data programată este obligatorie.',
  }),

  deliverySlots: z
    .array(z.enum(DELIVERY_SLOTS))
    .min(1, { message: 'Selectează cel puțin un interval orar.' }),

  assemblyId: z
    .string()
    .min(1, { message: 'Trebuie să selectezi un ansamblu.' }),
  trailerId: z.string().optional().nullable(),
  deliveryNotes: z.string().optional(),
})

export type ScheduleDeliveryInput = z.infer<typeof ScheduleDeliverySchema>
