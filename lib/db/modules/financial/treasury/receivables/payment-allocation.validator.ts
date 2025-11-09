import { z } from 'zod'
import { MongoId } from '@/lib/validator' // Presupun că ai acest validator

export const CreatePaymentAllocationSchema = z.object({
  paymentId: MongoId,
  invoiceId: MongoId,
  amountAllocated: z.number().positive('Suma alocată trebuie să fie pozitivă.'),
  allocationDate: z.date(),
})
