import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const CreateClientRefundAllocationSchema = z.object({
  advancePaymentId: MongoId,
  refundPaymentId: MongoId,
  amountAllocated: z.number().positive('Suma alocată trebuie să fie pozitivă.'),
  allocationDate: z.date(),
})

export type CreateClientRefundAllocationInput = z.infer<
  typeof CreateClientRefundAllocationSchema
>
