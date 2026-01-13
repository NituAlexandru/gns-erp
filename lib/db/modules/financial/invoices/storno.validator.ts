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
  quantity: z.number().negative('Cantitatea stornată trebuie să fie negativă.'),
}).refine(
  (data) => {
    // --- LOGICA DE VALIDARE ---

    // 1. Dacă e Intrare Manuală (text liber), nu cerem sursă.
    if (data.isManualEntry || data.productCode === 'MANUAL') {
      return true
    }

    // 2. Dacă e SERVICIU, nu cerem sursă (permitem storno "liber").
    // Dar dacă frontend-ul trimite un ID (storno din factură), îl acceptăm oricum.
    if (data.stockableItemType === 'Service') {
      return true
    }

    // 3. Pentru orice altceva (ex: Produse de Stoc - ERPProduct), Sursa e OBLIGATORIE.
    // Altfel nu putem returna produsul în stoc la costul corect.
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
