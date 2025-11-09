import { Types } from 'mongoose'
import { z } from 'zod'

// Am importat tipul CompanySnapshot din types, nu settings
import { CompanySnapshot } from '../../../financial/invoices/invoice.types'
import { FiscalAddressSchema } from '../../invoices/invoice.validator'
import { ISupplierDoc } from '../../../suppliers/types'
import { CreateSupplierInvoiceSchema } from './supplier-invoice.validator'
// Am corectat calea către supplier/types

// --- FIX ---
// Am redenumit tipul Zod pentru a se potrivi cu cel folosit în ISupplierDoc
export type IFiscalAddress = z.infer<typeof FiscalAddressSchema>

// Snapshot-ul furnizorului (pe cine plătim)
export type SupplierSnapshot = {
  name: string
  cui: string
  regCom: string
  address: IFiscalAddress // <-- Folosim tipul corectat
  bank?: string
  iban?: string
}

// Snapshot-ul companiei noastre (cum apărem noi pe factura lor)
export type OurCompanySnapshot = CompanySnapshot // <-- Folosim tipul importat

// O linie de pe factura primită
export interface SupplierInvoiceLine {
  productId?: string // Legătura opțională cu produsul nostru
  productName: string // Numele de pe factura lor
  productCode?: string // Codul de pe factura lor
  quantity: number
  unitOfMeasure: string
  unitPrice: number // Prețul unitar (fără TVA)
  lineValue: number // Valoarea liniei (fără TVA)
  vatRateDetails: {
    rate: number
    value: number
  }
  lineTotal: number // Valoarea totală (cu TVA)
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

// --- Interfața Documentului Mongoose ---
export interface ISupplierInvoiceDoc extends Document {
  _id: Types.ObjectId
  supplierId: Types.ObjectId | ISupplierDoc // <-- Am corectat calea
  supplierSnapshot: SupplierSnapshot
  ourCompanySnapshot: OurCompanySnapshot

  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date

  items: (SupplierInvoiceLine & { _id: Types.ObjectId })[]
  totals: SupplierInvoiceTotals

  status: 'NEPLATITA' | 'PLATITA_PARTIAL' | 'PLATITA_COMPLET' | 'ANULATA'
  paidAmount: number
  remainingAmount: number

  // TODO: De adăugat când modulul 'Receptii' e gata
  // sourceReceiptIds: Types.ObjectId[]

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
