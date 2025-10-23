
import { z } from 'zod'
import { DELIVERY_SLOTS } from './constants'

export const HeaderSchema = z.object({
  deliveryDate: z.date({ required_error: 'Data livrării este obligatorie.' }),
  deliverySlot: z.enum(DELIVERY_SLOTS, {
    required_error: 'Intervalul orar e obligatoriu.',
  }),
})
