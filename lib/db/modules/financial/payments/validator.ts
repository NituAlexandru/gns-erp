import { z } from 'zod'
import { PAYMENT_DOCUMENT_TYPES } from './constants' 
import { MongoId } from '@/lib/validator'

export const PaymentApplicationSchema = z.object({
  invoiceId: MongoId,
  amountApplied: z.number().positive('Suma aplicată trebuie să fie pozitivă.'),
})

// --- Validatorul FINAL (o singură schemă simplă) ---
export const CreateReceiptSchema = z.object({
  clientId: MongoId,
  partnerType: z.literal('Client'),
  paymentDate: z.date(),
  amount: z.number().positive('Suma trebuie să fie pozitivă.'),
  direction: z.literal('IN'),
  documentType: z.enum(PAYMENT_DOCUMENT_TYPES),
  seriesName: z.string().optional(), 
  documentNumber: z
    .string()
    .min(1, 'Numărul documentului (OP, Chitanță, etc.) este obligatoriu.'),
  notes: z.string().optional(),
  appliedToInvoices: z
    .array(PaymentApplicationSchema)
    .min(1, 'Trebuie aplicată cel puțin o factură.'),
})

export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>
