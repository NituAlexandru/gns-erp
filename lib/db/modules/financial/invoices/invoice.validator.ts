import { z } from 'zod'
import { MongoId } from '@/lib/validator' // Presupunem că ai acest validator
import { ADVANCE_SCOPES } from './invoice.constants'

export const CostBreakdownBatchSchema = z.object({
  movementId: MongoId.optional(),
  entryDate: z.date(),
  quantity: z.number(),
  unitCost: z.number(),
  type: z.enum(['REAL', 'PROVISIONAL']),
})
// Snapshot-ul adresei fiscale (e-Factura ready)
export const FiscalAddressSchema = z.object({
  judet: z.string().min(1, 'Județul este obligatoriu.'),
  localitate: z.string().min(1, 'Localitatea este obligatorie.'),
  strada: z.string().min(1, 'Strada este obligatorie.'),
  numar: z.string().optional(),
  codPostal: z.string().min(1, 'Codul poștal este obligatoriu.'),
  tara: z.string().min(2, 'Codul țării este obligatoriu (ex: RO).'),
  alteDetalii: z.string().optional(),
  persoanaContact: z.string().optional(),
  telefonContact: z.string().optional(),
})

// Snapshot-ul companiei tale
export const CompanySnapshotSchema = z.object({
  name: z.string(),
  cui: z.string(),
  regCom: z.string(),
  address: FiscalAddressSchema,
  email: z.string(),
  phone: z.string(),
  bank: z.string(),
  iban: z.string(),
  currency: z.string(),
})

// Snapshot-ul clientului
export const ClientSnapshotSchema = z.object({
  name: z.string(),
  cui: z.string(),
  regCom: z.string(),
  address: FiscalAddressSchema, // Folosim aceeași structură
  bank: z.string().optional(),
  iban: z.string().optional(),
})

// O linie din factură
export const InvoiceLineSchema = z.object({
  sourceDeliveryNoteId: MongoId.optional(), // ID-ul avizului sursă
  sourceDeliveryNoteLineId: MongoId.optional(), // ID-ul liniei din aviz
  sourceInvoiceLineId: MongoId.optional(),
  sourceInvoiceId: MongoId.optional(),
  productId: MongoId.optional(),
  serviceId: MongoId.optional(),
  stockableItemType: z.enum(['ERPProduct', 'Packaging', 'Service']).optional(),
  isManualEntry: z.boolean().default(false),
  productName: z.string().min(1),
  productCode: z.string().optional(),
  quantity: z.number(),
  unitOfMeasure: z.string().min(1),
  unitOfMeasureCode: z.string().optional(), // Cod UN/ECE
  codNC: z.string().optional(), // Cod Vamal (opțional)
  baseUnit: z.string().optional(),
  conversionFactor: z.number().optional().default(1),
  quantityInBaseUnit: z.number().optional(),
  priceInBaseUnit: z.number().optional(),
  minimumSalePrice: z.number().optional(),
  packagingOptions: z
    .array(
      z.object({
        unitName: z.string(),
        baseUnitEquivalent: z.number(),
      })
    )
    .optional()
    .default([]),
  unitPrice: z.number(), // Prețul unitar (fără TVA)
  lineValue: z.number(), // Valoarea liniei (fără TVA)
  vatRateDetails: z.object({
    rate: z.number().nonnegative(),
    value: z.number(),
  }),
  lineTotal: z.number(), // Valoarea totală (cu TVA)
  lineCostFIFO: z.number().optional(),
  lineProfit: z.number().optional().default(0), // Profitul în RON
  lineMargin: z.number().optional().default(0),
  costBreakdown: z.array(CostBreakdownBatchSchema).optional().default([]),
  stornedQuantity: z.number().optional().default(0),
  relatedAdvanceId: MongoId.optional().nullable(),
})

// Totalurile facturii
export const InvoiceTotalsSchema = z.object({
  // Produse
  productsSubtotal: z.number().default(0),
  productsVat: z.number().default(0),
  productsCost: z.number().default(0),
  productsProfit: z.number().default(0),
  productsMargin: z.number().default(0),

  // NOU: Ambalaje
  packagingSubtotal: z.number().default(0),
  packagingVat: z.number().default(0),
  packagingCost: z.number().default(0),
  packagingProfit: z.number().default(0),
  packagingMargin: z.number().default(0),

  // Servicii
  servicesSubtotal: z.number().default(0),
  servicesVat: z.number().default(0),
  servicesCost: z.number().default(0),
  servicesProfit: z.number().default(0),
  servicesMargin: z.number().default(0),

  // Linii Manuale
  manualSubtotal: z.number().default(0),
  manualVat: z.number().default(0),
  manualCost: z.number().default(0),
  manualProfit: z.number().default(0),
  manualMargin: z.number().default(0),

  // Totaluri Generale
  subtotal: z.number(),
  vatTotal: z.number(),
  grandTotal: z.number(),
  totalCost: z.number().default(0),
  totalProfit: z.number().default(0),
  profitMargin: z.number().default(0),
})

// --- Schema Principală (pentru Creare/Update) ---
export const InvoiceInputSchema = z.object({
  clientId: MongoId.optional(),
  clientSnapshot: ClientSnapshotSchema.optional(),
  deliveryAddressId: MongoId,
  deliveryAddress: FiscalAddressSchema,
  salesAgentId: MongoId.optional(),
  salesAgentSnapshot: z.object({ name: z.string() }).optional(),
  invoiceNumber: z.string().optional(),
  seriesName: z.string().min(1, 'Seria este obligatorie.'),
  invoiceType: z
    .enum(['STANDARD', 'AVANS', 'PROFORMA', 'STORNO'])
    .default('STANDARD'),
  invoiceDate: z.date({ required_error: 'Data emiterii este obligatorie.' }),
  dueDate: z.date({ required_error: 'Data scadenței este obligatorie.' }),
  items: z
    .array(InvoiceLineSchema)
    .min(1, 'Factura trebuie să aibă cel puțin o linie.'),
  totals: InvoiceTotalsSchema,
  sourceDeliveryNotes: z.array(MongoId).default([]), // Lista ID-urilor avizelor folosite
  relatedInvoiceIds: z.array(MongoId).default([]), // (pentru a ține minte ce stornăm)
  // Câmpuri opționale
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
  advanceScope: z.enum(ADVANCE_SCOPES).optional(),
})
