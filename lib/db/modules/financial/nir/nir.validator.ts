import { z } from 'zod'
import { NIR_STATUSES } from './nir.constants'
import { MongoId } from '@/lib/validator'
import { Types } from 'mongoose'

// --- Snapshots ---
const CompanySnapshotSchema = z.object({
  name: z.string().min(1),
  cui: z.string().min(1),
  regCom: z.string().optional(),
  address: z.any().optional(),
  bankAccounts: z.any().optional(),
  capitalSocial: z.string().optional(),
  phones: z.any().optional(),
  emails: z.any().optional(),
})

const SupplierSnapshotSchema = z.object({
  name: z.string().min(1),
  cui: z.string().min(1),
})

// --- Documente Suport ---
const InvoiceRefSchema = z.object({
  series: z.string().optional(),
  number: z.string().min(1),
  date: z.coerce.date(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  vatRate: z.number().optional(),
  vatValue: z.number().optional(),
  totalWithVat: z.number().optional(),
})

const DeliveryRefSchema = z.object({
  dispatchNoteSeries: z.string().optional(),
  dispatchNoteNumber: z.string().min(1),
  dispatchNoteDate: z.coerce.date(),
  driverName: z.string().optional(),
  carNumber: z.string().optional(),
  transportType: z.string().optional(),
  transportCost: z.number().optional(),
  transportVatRate: z.number().optional(),
  transportVatValue: z.number().optional(),
  tertiaryTransporterDetails: z
    .object({
      name: z.string().optional(),
      cui: z.string().optional(),
      regCom: z.string().optional(),
    })
    .optional(),
})
const QualityDetailsSchema = z
  .object({
    lotNumbers: z.array(z.string()).optional(),
    certificateNumbers: z.array(z.string()).optional(),
    testReports: z.array(z.string()).optional(),
    additionalNotes: z.string().optional(),
  })
  .optional()
// --- Linii ---
export const NirLineSchema = z.object({
  receptionLineId: z.string().optional(),
  stockableItemType: z.enum(['ERPProduct', 'Packaging']),
  productId: MongoId.optional(),
  packagingId: MongoId.optional(),
  productName: z.string().min(1),
  productCode: z.string().optional(),
  unitMeasure: z.string().min(1),
  documentQuantity: z.number().nonnegative(),
  quantity: z.number().nonnegative(),
  quantityDifference: z.number(),
  invoicePricePerUnit: z.number().nonnegative(),
  vatRate: z.number().nonnegative(),
  distributedTransportCostPerUnit: z.number().nonnegative().default(0),
  landedCostPerUnit: z.number().nonnegative(),
  lineValue: z.number().nonnegative(),
  lineVatValue: z.number().nonnegative(),
  lineTotal: z.number().nonnegative(),
  qualityDetails: QualityDetailsSchema,
})

// --- Totaluri (Structura DeliveryNote) ---
export const NirTotalsSchema = z.object({
  productsSubtotal: z.number().nonnegative(),
  productsVat: z.number().nonnegative(),
  packagingSubtotal: z.number().nonnegative(),
  packagingVat: z.number().nonnegative(),
  transportSubtotal: z.number().nonnegative(),
  transportVat: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  vatTotal: z.number().nonnegative(),
  grandTotal: z.number().nonnegative(),
  totalEntryValue: z.number().nonnegative(),
})

// --- Schema Principală ---
export const CreateNirSchema = z.object({
  receptionId: MongoId,
  supplierId: MongoId,
  invoices: z.array(InvoiceRefSchema).optional().default([]),
  deliveries: z.array(DeliveryRefSchema).optional().default([]),
  seriesName: z.string().min(1),
  companySnapshot: CompanySnapshotSchema,
  supplierSnapshot: SupplierSnapshotSchema,
  receivedBy: z.object({
    userId: MongoId,
    name: z.string(),
  }),
  items: z.array(NirLineSchema).min(1),
  totals: NirTotalsSchema,
  destinationLocation: z.string(),
  orderRef: z.string().or(z.instanceof(Types.ObjectId)).nullable().optional(),
})

export const UpdateNirStatusSchema = z.object({
  nirId: MongoId,
  status: z.enum(NIR_STATUSES),
  updatedBy: MongoId,
  updatedByName: z.string().min(1),
  reason: z.string().optional(),
})

export type CreateNirInput = z.infer<typeof CreateNirSchema>

export const EditNirSchema = CreateNirSchema.extend({
  nirNumber: z.string().min(1, 'Numărul NIR este obligatoriu.'),
  nirDate: z.coerce.date({ required_error: 'Data este obligatorie.' }),
  items: z.array(NirLineSchema).min(1, 'Lista de articole nu poate fi goală.'),
})

export type EditNirInput = z.infer<typeof EditNirSchema>
