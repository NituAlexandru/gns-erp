import { z } from 'zod'
import { DELIVERY_SLOTS } from './constants'

export const HeaderSchema = z.object({
  requestedDeliveryDate: z.date({
    required_error: 'Data solicitata a livrării este obligatorie.',
  }),
  requestedDeliverySlot: z.enum(DELIVERY_SLOTS, {
    required_error: 'Intervalul orar solicitat este obligatoriu.',
  }),
  deliveryNotes: z.string().optional(),
  uitCode: z.string().optional(),
})
