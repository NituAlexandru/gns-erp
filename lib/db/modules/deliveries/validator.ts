import { z } from 'zod'
import { DELIVERY_SLOTS } from './constants'

export const HeaderSchema = z.object({
  requestedDeliveryDate: z.date({
    required_error: 'Data solicitata a livrării este obligatorie.',
  }),
  requestedDeliverySlots: z
    .array(z.enum(DELIVERY_SLOTS))
    .min(1, { message: 'Selectează cel puțin un interval orar solicitat.' }), // <-- MODIFICAT
  deliveryNotes: z.string().optional(),
  uitCode: z.string().optional(),
})
