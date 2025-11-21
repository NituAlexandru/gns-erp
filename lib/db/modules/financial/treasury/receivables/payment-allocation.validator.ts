import { z } from 'zod'
import { MongoId } from '@/lib/validator' // Presupun că ai acest validator

export const CreatePaymentAllocationSchema = z.object({
  paymentId: MongoId,
  invoiceId: MongoId,
  amountAllocated: z.number().refine((val) => val !== 0, {
    message: 'Suma alocată nu poate fi zero.',
  }),
  allocationDate: z.date(),
})
