import { z } from 'zod'
import { CreateReceiptSchema } from './validator'
import { IPaymentDoc } from './payment.model'
import { InvoiceDTO } from '../invoices/invoice.types'

// Input-ul pentru formularul de creare încasare
export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>

// DTO - Ce trimitem la client
export type PaymentDTO = Omit<IPaymentDoc, 'appliedToInvoices'> & {
  _id: string
  appliedToInvoices: {
    invoiceId: string | InvoiceDTO
    amountApplied: number
  }[]
  createdAt: string
  updatedAt: string
}

// Răspunsul acțiunilor
type PaymentActionResultSuccess = {
  success: true
  data: PaymentDTO
  message: string
}
type PaymentActionResultError = {
  success: false
  message: string
}
export type PaymentActionResult =
  | PaymentActionResultSuccess
  | PaymentActionResultError
