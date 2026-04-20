import { z } from 'zod'
import { MongoId } from '@/lib/validator'

// 1. Schema pentru Adresă (conform cu ReceiptAddress din types)
export const ReceiptAddressSchema = z.object({
  judet: z.string().optional(),
  localitate: z.string().optional(),
  strada: z.string().optional(),
  numar: z.string().optional(),
  codPostal: z.string().optional(),
  alteDetalii: z.string().optional(),
  tara: z.string().optional().default('RO'),
})

// 2. Schema pentru o Linie de Alocare (Factura plătită)
const ReceiptAllocationItemSchema = z.object({
  invoiceId: MongoId,
  invoiceSeries: z.string(),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  totalAmount: z.number(),
  remainingAmount: z.number(),
  amountToPay: z.number().positive('Suma alocată trebuie să fie pozitivă.'),
})

// 3. Schema Principală pentru Creare Chitanță
export const CreateReceiptSchema = z
  .object({
    seriesName: z.string().optional(),
    clientId: MongoId,
    clientName: z.string().min(1, 'Numele clientului este obligatoriu.'),
    clientCui: z.string().optional(),
    clientAddress: ReceiptAddressSchema,
    representative: z.string().min(1, 'Reprezentantul este obligatoriu.'),
    explanation: z.string().min(1, 'Explicația este obligatorie.'),
    amount: z.number().positive('Suma încasată trebuie să fie mai mare ca 0.'),
    invoices: z.array(MongoId).optional().default([]),
    allocations: z.array(ReceiptAllocationItemSchema).optional().default([]),
  })
  .refine(
    (data) => {
      const totalAllocated = data.allocations.reduce(
        (sum, a) => sum + a.amountToPay,
        0,
      )
      // Rotunjim la 2 zecimale pentru comparație (evităm erorile de tip 0.0000000001)
      return (
        Math.round(totalAllocated * 100) / 100 <=
        Math.round(data.amount * 100) / 100
      )
    },
    {
      message: 'Suma alocată pe facturi depășește suma totală a chitanței!',
      path: ['amount'], // Eroarea va apărea lângă input-ul de sumă
    },
  )

// Exportăm tipul inferat pentru a-l putea folosi în backend dacă e nevoie
export type CreateReceiptInput = z.infer<typeof CreateReceiptSchema>
