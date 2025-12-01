import { Types, Document } from 'mongoose'
import { z } from 'zod'
import { CompanySnapshot } from '../../../financial/invoices/invoice.types'
import { FiscalAddressSchema } from '../../invoices/invoice.validator'
import { ISupplierDoc } from '../../../suppliers/types'
import { CreateSupplierInvoiceSchema } from './supplier-invoice.validator'
import { SupplierInvoiceStatus } from './supplier-invoice.constants'

export type IFiscalAddress = z.infer<typeof FiscalAddressSchema>

// Snapshot-ul furnizorului (pe cine plătim)
export type SupplierSnapshot = {
  name: string
  cui: string
  regCom: string
  address: IFiscalAddress
  bank?: string
  iban?: string
  capital?: string
  bic?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
}

// Snapshot-ul companiei noastre
export type OurCompanySnapshot = CompanySnapshot & {
  contactName?: string
}
// O linie de pe factura primită
export interface SupplierInvoiceLine {
  productId?: string
  productName: string
  productCode?: string
  quantity: number
  unitOfMeasure: string
  unitCode?: string
  unitPrice: number
  lineValue: number
  vatRateDetails: {
    rate: number
    value: number
  }
  lineTotal: number
  originCountry?: string
  baseQuantity?: number
  allowanceAmount?: number
  description?: string
  cpvCode?: string
}
export interface SupplierInvoiceReferences {
  contract?: string
  order?: string
  salesOrder?: string
  despatch?: string
  deliveryLocationId?: string
  deliveryPartyName?: string
  actualDeliveryDate?: Date
  billingReference?: {
    oldInvoiceNumber: string
    oldInvoiceDate?: Date
  }
}
// Totalurile de pe factura primită
export interface SupplierInvoiceTotals {
  productsSubtotal: number
  productsVat: number
  packagingSubtotal: number
  packagingVat: number
  servicesSubtotal: number
  servicesVat: number
  manualSubtotal: number
  manualVat: number
  subtotal: number
  vatTotal: number
  grandTotal: number
  payableAmount?: number
  prepaidAmount?: number
  globalDiscount?: number
  globalTax?: number
}

export interface ISupplierInvoiceDoc extends Document {
  _id: Types.ObjectId
  supplierId: Types.ObjectId | ISupplierDoc
  supplierSnapshot: SupplierSnapshot
  ourCompanySnapshot: OurCompanySnapshot
  invoiceType: 'STANDARD' | 'STORNO' | 'AVANS'
  invoiceTypeCode?: string
  invoiceSeries: string
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  taxPointDate?: Date
  items: (SupplierInvoiceLine & { _id: Types.ObjectId })[]
  totals: SupplierInvoiceTotals
  taxSubtotals?: Array<{
    taxableAmount: number
    taxAmount: number
    percent: number
    categoryCode: string
  }>
  paymentId?: string
  buyerReference?: string
  paymentMethodCode?: string
  invoiceCurrency?: string
  references?: SupplierInvoiceReferences
  invoicePeriod?: {
    startDate: Date
    endDate: Date
  }
  exchangeRate?: number
  status: SupplierInvoiceStatus
  paidAmount: number
  remainingAmount: number
  eFacturaXMLId?: string
  eFacturaIndex?: string
  notes?: string
  paymentTermsNote?: string
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

// Tipul de Input (din Zod, pentru formulare)
export type CreateSupplierInvoiceInput = z.infer<
  typeof CreateSupplierInvoiceSchema
>
