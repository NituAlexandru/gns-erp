import { z } from 'zod'
import { PAYMENT_METHODS } from '../payment.constants'
import { MongoId } from '@/lib/validator' 

export const CreateClientPaymentSchema = z.object({
  clientId: MongoId,
  paymentDate: z.date({
    required_error: 'Data plății este obligatorie.',
  }),
  paymentMethod: z.enum(PAYMENT_METHODS),
  totalAmount: z
    .number({ required_error: 'Suma este obligatorie.' })
    .positive('Suma trebuie să fie mai mare ca 0.'),
  seriesName: z.string().min(1, 'Seria este obligatorie.'),
  referenceDocument: z.string().optional(),
  notes: z.string().optional(),
})
