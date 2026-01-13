import { z } from 'zod'
import {
  InvoiceInputSchema,
  InvoiceLineSchema,
  CostBreakdownBatchSchema,
} from './invoice.validator'
import { MongoId } from '@/lib/validator'

const StornoLineSchema = InvoiceLineSchema.extend({
  sourceInvoiceLineId: z.string().optional(),
  costBreakdown: z.array(CostBreakdownBatchSchema).optional().default([]),
  lineCostFIFO: z.number().optional().default(0),
  quantity: z.number().refine((val) => val !== 0, 'Cantitatea nu poate fi 0.'),
}).refine(
  (data) => {
    // Logica pentru sursă rămâne neschimbată (corectă)
    if (data.isManualEntry || data.productCode === 'MANUAL') {
      return true
    }
    if (data.stockableItemType === 'Service') {
      return true
    }
    return !!data.sourceInvoiceLineId
  },
  {
    message:
      'Linia sursă a facturii lipsește. Produsele de stoc trebuie stornate dintr-o factură existentă.',
    path: ['sourceInvoiceLineId'],
  }
)

export const CreateStornoSchema = InvoiceInputSchema.extend({
  items: z
    .array(StornoLineSchema)
    .min(1, 'Factura storno trebuie să aibă cel puțin o linie.'),
  invoiceType: z.literal('STORNO'),
  relatedInvoiceIds: z.array(MongoId).default([]),
  returnNoteSeriesName: z
    .string()
    .min(1, 'Seria pentru Nota de Retur este obligatorie.'),
})

export type CreateStornoInput = z.infer<typeof CreateStornoSchema>
