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
}

// Snapshot-ul companiei noastre
export type OurCompanySnapshot = CompanySnapshot

// O linie de pe factura primită
export interface SupplierInvoiceLine {
  productId?: string
  productName: string
  productCode?: string
  quantity: number
  unitOfMeasure: string
  unitPrice: number
  lineValue: number
  vatRateDetails: {
    rate: number
    value: number
  }
  lineTotal: number
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
}

export interface ISupplierInvoiceDoc extends Document {
  _id: Types.ObjectId
  supplierId: Types.ObjectId | ISupplierDoc
  supplierSnapshot: SupplierSnapshot
  ourCompanySnapshot: OurCompanySnapshot
  invoiceType: 'STANDARD' | 'STORNO' | 'AVANS'
  invoiceSeries: string
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  items: (SupplierInvoiceLine & { _id: Types.ObjectId })[]
  totals: SupplierInvoiceTotals
  status: SupplierInvoiceStatus
  paidAmount: number
  remainingAmount: number
  eFacturaXMLId?: string
  eFacturaIndex?: string
  notes?: string
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

// 3. Tipul de Input (din Zod, pentru formulare)
export type CreateSupplierInvoiceInput = z.infer<
  typeof CreateSupplierInvoiceSchema
>
