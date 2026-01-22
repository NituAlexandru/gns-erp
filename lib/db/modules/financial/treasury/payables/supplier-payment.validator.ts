import { z } from 'zod'
import { PAYMENT_METHODS } from '../payment.constants'
import { MongoId } from '@/lib/validator'

export const BudgetCategorySnapshotSchema = z
  .object({
    mainCategoryId: MongoId,
    mainCategoryName: z.string(),
    subCategoryId: MongoId.optional(),
    subCategoryName: z.string().optional(),
  })
  .optional()

export const SupplierPaymentPayloadSchema = z.object({
  supplierId: MongoId,
  paymentDate: z.date({
    required_error: 'Data plății este obligatorie.',
  }),
  paymentMethod: z.enum(PAYMENT_METHODS),
  totalAmount: z
    .number({ required_error: 'Suma este obligatorie.' })
    .positive('Suma trebuie să fie mai mare ca 0.'),
  unallocatedAmount: z.coerce.number().min(0),
  paymentNumber: z.string().min(1, 'Numărul documentului este obligatoriu.'),
  seriesName: z.string().optional(),
  referenceDocument: z.string().optional().default(''),
  notes: z.string().optional(),
  budgetCategorySnapshot: BudgetCategorySnapshotSchema,
})

export const CreateSupplierPaymentFormSchema =
  SupplierPaymentPayloadSchema.omit({
    unallocatedAmount: true,
    budgetCategorySnapshot: true,
  }).extend({
    mainCategoryId: MongoId.optional(),
    subCategoryId: MongoId.optional(),
  })
