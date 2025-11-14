import { z } from 'zod'
import { MongoId } from '@/lib/validator'
import { FiscalAddressSchema } from '../../../financial/invoices/invoice.validator'

// Snapshot-ul furnizorului
export const SupplierSnapshotSchema = z.object({
  name: z.string(),
  cui: z.string(),
  regCom: z.string(),
  address: FiscalAddressSchema,
  bank: z.string().optional(),
  iban: z.string().optional(),
})

// O linie de pe factura primită
export const SupplierInvoiceLineSchema = z.object({
  productId: MongoId.optional().nullable(),
  productName: z.string().min(1, 'Numele produsului este obligatoriu.'),
  productCode: z.string().optional(),
  quantity: z.number(),
  unitOfMeasure: z.string().min(1, 'UM este obligatoriu.'),
  unitPrice: z.number(), // Prețul unitar (fără TVA)
  lineValue: z.number(), // Valoarea liniei (fără TVA)
  vatRateDetails: z.object({
    rate: z.number().nonnegative(),
    value: z.number(),
  }),
  lineTotal: z.number(), // Valoarea totală (cu TVA)
})

// Totalurile de pe factura primită
export const SupplierInvoiceTotalsSchema = z.object({
  productsSubtotal: z.number().default(0),
  productsVat: z.number().default(0),
  packagingSubtotal: z.number().default(0),
  packagingVat: z.number().default(0),
  servicesSubtotal: z.number().default(0),
  servicesVat: z.number().default(0),
  manualSubtotal: z.number().default(0),
  manualVat: z.number().default(0),
  subtotal: z.number(),
  vatTotal: z.number(),
  grandTotal: z.number(),
})

// Schema de creare (pentru formularul manual)
export const CreateSupplierInvoiceSchema = z.object({
  supplierId: MongoId,
  supplierSnapshot: SupplierSnapshotSchema,
  invoiceSeries: z.string().min(1, 'Seria facturii furnizor este obligatorie.'),
  invoiceNumber: z
    .string()
    .min(1, 'Numărul facturii furnizor este obligatoriu.'),
  invoiceDate: z.date({ required_error: 'Data facturii este obligatorie.' }),
  dueDate: z.date({ required_error: 'Data scadenței este obligatorie.' }),

  items: z
    .array(SupplierInvoiceLineSchema)
    .min(1, 'Factura trebuie să aibă cel puțin o linie.'),
  totals: SupplierInvoiceTotalsSchema,
  notes: z.string().optional(),

  // TODO: De adăugat 'sourceReceiptIds' când e gata
})
