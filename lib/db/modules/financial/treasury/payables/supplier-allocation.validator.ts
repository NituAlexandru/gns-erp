import { z } from 'zod'
import { MongoId } from '@/lib/validator'

export const CreateSupplierAllocationSchema = z.object({
  paymentId: MongoId,
  invoiceId: MongoId,
  amountAllocated: z.number().positive('Suma alocată trebuie să fie pozitivă.'),
  allocationDate: z.date(),
})
