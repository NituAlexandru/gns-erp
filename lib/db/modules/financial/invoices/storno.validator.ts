import { z } from 'zod'
import {
  InvoiceInputSchema,
  InvoiceLineSchema,
  CostBreakdownBatchSchema,
} from './invoice.validator' // <-- Asigură-te că 'CostBreakdownBatchSchema' e importat
import { MongoId } from '@/lib/validator'

const StornoLineSchema = InvoiceLineSchema.extend({
  sourceInvoiceLineId: z.string().min(1, 'Linia sursă a facturii lipsește.'),
  costBreakdown: z
    .array(CostBreakdownBatchSchema)
    .min(1, 'Detalierea costului original lipsește.'),
  lineCostFIFO: z.number(),
  quantity: z.number().negative('Cantitatea stornată trebuie să fie negativă.'),
})

export const CreateStornoSchema = InvoiceInputSchema.extend({
  items: z
    .array(StornoLineSchema)
    .min(1, 'Factura storno trebuie să aibă cel puțin o linie.'),
  invoiceType: z.literal('STORNO'),
  relatedInvoiceIds: z
    .array(MongoId)
    .min(
      1,
      'Factura storno trebuie să fie legată de cel puțin o factură originală.'
    ),
  returnNoteSeriesName: z
    .string()
    .min(1, 'Seria pentru Nota de Retur este obligatorie.'),
})

export type CreateStornoInput = z.infer<typeof CreateStornoSchema>
