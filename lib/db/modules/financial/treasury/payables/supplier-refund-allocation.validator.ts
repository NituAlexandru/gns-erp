import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const CreateSupplierRefundAllocationSchema = z.object({
  advancePaymentId: MongoId,
  refundPaymentId: MongoId,
  // Suma alocată este mereu pozitivă (ex: 900), facem matematica de plus/minus în backend
  amountAllocated: z.number().positive('Suma alocată trebuie să fie pozitivă.'),
  allocationDate: z.date(),
})

export type CreateSupplierRefundAllocationInput = z.infer<
  typeof CreateSupplierRefundAllocationSchema
>
