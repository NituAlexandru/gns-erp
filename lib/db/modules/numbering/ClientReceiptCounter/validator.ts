import { z } from 'zod'

export const ClientReceiptCounterSchema = z.object({
  clientId: z.string().min(1, 'ID-ul clientului este obligatoriu.'),
  year: z.number().int().min(2000).max(2100),
  currentNumber: z.number().int().nonnegative(),
})

export type CreateClientReceiptCounterInput = z.infer<
  typeof ClientReceiptCounterSchema
>
