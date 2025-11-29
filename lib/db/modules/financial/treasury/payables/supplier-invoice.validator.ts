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
  capital: z.string().optional(),
  bic: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
})

// O linie de pe factura primită
export const SupplierInvoiceLineSchema = z.object({
  productId: MongoId.optional().nullable(),
  productName: z.string().min(1, 'Numele produsului este obligatoriu.'),
  productCode: z.string().optional(),
  quantity: z.number(),
  unitOfMeasure: z.string().min(1, 'UM este obligatoriu.'),
  unitCode: z.string().optional(),
  unitPrice: z.number(), // Prețul unitar (fără TVA)
  lineValue: z.number(), // Valoarea liniei (fără TVA)
  vatRateDetails: z.object({
    rate: z.number().nonnegative(),
    value: z.number(),
  }),
  lineTotal: z.number(), // Valoarea totală (cu TVA)
  originCountry: z.string().optional(),
  baseQuantity: z.number().optional(),
  allowanceAmount: z.number().optional(),
  description: z.string().optional(),
  cpvCode: z.string().optional(),
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
  payableAmount: z.number().optional(),
  prepaidAmount: z.number().optional(),
  globalDiscount: z.number().optional(),
  globalTax: z.number().optional(),
})

// Schema de creare (pentru formularul manual)
export const CreateSupplierInvoiceSchema = z.object({
  supplierId: MongoId,
  supplierSnapshot: SupplierSnapshotSchema,
  invoiceType: z.enum(['STANDARD', 'STORNO', 'AVANS']).default('STANDARD'),
  invoiceSeries: z.string().min(1, 'Seria facturii furnizor este obligatorie.'),
  invoiceNumber: z
    .string()
    .min(1, 'Numărul facturii furnizor este obligatoriu.'),
  invoiceDate: z.date({ required_error: 'Data facturii este obligatorie.' }),
  dueDate: z.date({ required_error: 'Data scadenței este obligatorie.' }),
  taxPointDate: z.date().optional(),
  items: z
    .array(SupplierInvoiceLineSchema)
    .min(1, 'Factura trebuie să aibă cel puțin o linie.'),
  totals: SupplierInvoiceTotalsSchema,
  notes: z.string().optional(),
  paymentTermsNote: z.string().optional(),
  taxSubtotals: z
    .array(
      z.object({
        taxableAmount: z.number(),
        taxAmount: z.number(),
        percent: z.number(),
        categoryCode: z.string(),
      })
    )
    .optional(),
  paymentId: z.string().optional(),
  buyerReference: z.string().optional(),
  paymentMethodCode: z.string().optional(),
  invoiceCurrency: z.string().optional(),
  references: z
    .object({
      contract: z.string().optional(),
      order: z.string().optional(),
      salesOrder: z.string().optional(),
      despatch: z.string().optional(),
      deliveryLocationId: z.string().optional(),
      deliveryPartyName: z.string().optional(),
      actualDeliveryDate: z.date().optional(),
      billingReference: z
        .object({
          oldInvoiceNumber: z.string(),
          oldInvoiceDate: z.date().optional(),
        })
        .optional(),
    })
    .optional(),
  invoicePeriod: z
    .object({
      startDate: z.date(),
      endDate: z.date(),
    })
    .optional(),
  exchangeRate: z.number().optional(),
  // TODO: De adăugat 'sourceReceiptIds' când e gata
})
