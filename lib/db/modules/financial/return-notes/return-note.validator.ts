import { z } from 'zod'
import { MongoId } from '@/lib/validator'
import { CostBreakdownBatchSchema } from '../invoices/invoice.validator' // Importăm schema de cost
import { RETURN_NOTE_REASONS } from './return-note.constants'
import { LocationOrProjectIdSchema } from '../../inventory/validator'

// Validator pentru O SINGURĂ linie din nota de retur
export const ReturnNoteLineSchema = z.object({
  productId: MongoId,
  stockableItemType: z.enum(['ERPProduct', 'Packaging']),

  productName: z.string(),
  productCode: z.string().optional(),

  quantity: z.number().positive('Cantitatea trebuie să fie pozitivă.'),
  unitOfMeasure: z.string(),
  baseUnit: z.string(),
  quantityInBaseUnit: z
    .number()
    .positive('Cantitatea în unități de bază trebuie să fie pozitivă.'),

  // Costul la care a IEȘIT marfa. E obligatoriu.
  costBreakdown: z
    .array(CostBreakdownBatchSchema)
    .min(1, 'Detalierea costului este obligatorie.'),
  unitCost: z.number().nonnegative('Costul unitar nu poate fi negativ.'),

  // Legătura cu documentul original
  sourceInvoiceLineId: MongoId.optional(),
  sourceDeliveryNoteLineId: MongoId.optional(),
})

// Validator pentru crearea unei Note de Retur
export const CreateReturnNoteSchema = z.object({
  seriesName: z.string().min(1, 'Seria este obligatorie.'),
  returnNoteDate: z.date(),

  clientId: MongoId,
  deliveryAddressId: MongoId, // Adresa de unde se ridică marfa
  locationTo: LocationOrProjectIdSchema.default('DEPOZIT'),
  reason: z.enum(RETURN_NOTE_REASONS),

  notes: z.string().optional(),

  // Legături
  relatedInvoiceId: MongoId.optional(), // Factura Storno care a generat-o
  relatedDeliveryNoteId: MongoId.optional(), // Avizul original (pt retur manual)

  // Liniile trebuie să fie un array cu cel puțin un element
  items: z
    .array(ReturnNoteLineSchema)
    .min(1, 'Nota de retur trebuie să conțină cel puțin un articol.'),
})

export type CreateReturnNoteInput = z.infer<typeof CreateReturnNoteSchema>
