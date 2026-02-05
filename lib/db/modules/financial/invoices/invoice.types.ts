import { z } from 'zod'
import {
  InvoiceInputSchema,
  InvoiceLineSchema,
  InvoiceTotalsSchema,
  ClientSnapshotSchema,
  CompanySnapshotSchema,
} from './invoice.validator'
import { EFACTURA_STATUSES, INVOICE_STATUSES } from './invoice.constants'
import { IClientDoc } from '../../client/types'
import { IUser } from '../../user/user.model'
import { IInvoiceDoc } from './invoice.model'
import { VatCategoryCode } from '../../setting/efactura/outgoing/outgoing.constants'

// Tipuri exportate din Zod
export type InvoiceInput = z.infer<typeof InvoiceInputSchema>
export type InvoiceLineInput = z.infer<typeof InvoiceLineSchema>
export type InvoiceTotals = z.infer<typeof InvoiceTotalsSchema>
export type ClientSnapshot = z.infer<typeof ClientSnapshotSchema>
export type CompanySnapshot = z.infer<typeof CompanySnapshotSchema>

// Tipuri Enum
export type InvoiceStatusKey = (typeof INVOICE_STATUSES)[number]
export type EFacturaStatusKey = (typeof EFACTURA_STATUSES)[number]

// Interfața DTO (ce trimitem la client)
export interface InvoiceDTO {
  _id: string
  sequenceNumber: number
  invoiceNumber: string // Combinația (ex: 'F-GNS/00001')
  invoiceDate: string // ISO Date
  dueDate: string // ISO Date
  clientId: string
  clientSnapshot: ClientSnapshot
  companySnapshot: CompanySnapshot
  items: (InvoiceLineInput & { _id: string })[]
  totals: InvoiceTotals
  sourceDeliveryNotes: string[] // Array de ID-uri
  relatedOrders: string[]
  relatedDeliveries: string[]
  status: InvoiceStatusKey
  rejectionReason?: string
  eFacturaStatus: EFacturaStatusKey
  eFacturaError?: string
  eFacturaUploadId?: string
  invoiceType: 'STANDARD' | 'STORNO'
  vatCategory: VatCategoryCode
  vatExemptionReason?: string
  createdBy: string
  createdByName: string
  approvedBy?: string
  approvedByName?: string
  driverName?: string
  vehicleNumber?: string
  vehicleType?: string
  trailerNumber?: string
  uitCode?: string
  splitGroupId?: string
  createdAt: string
  updatedAt: string
}
// --- Tipuri de Răspuns pentru Acțiuni ---

// Răspuns de succes la creare/update
type InvoiceActionResultSuccess = {
  success: true
  data: InvoiceDTO
}

// Răspuns de eroare
type InvoiceActionResultError = {
  success: false
  message: string
}
export type InvoiceActionSelectionRequired = {
  success: false
  requireSelection: true
  message: string
  series: string[]
}
// Tipul uniune pentru funcțiile de creare/update
export type InvoiceActionResult =
  | InvoiceActionResultSuccess
  | InvoiceActionResultError
  | InvoiceActionSelectionRequired

export interface UnsettledAdvanceDTO {
  _id: string
  seriesName: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number // Suma totală a facturii de avans
  remainingAmount: number // Suma rămasă de folosit
  advanceScope: 'GLOBAL' | 'ADDRESS_SPECIFIC'
}

export interface StornoSourceInvoiceDTO {
  _id: string
  seriesName: string
  invoiceNumber: string
  invoiceDate: string
  grandTotal: number
  remainingToStorno: number // Cât a mai rămas de stornat din ea
}

export interface StornableProductDTO {
  productId: string
  productName: string
  unitOfMeasure: string
  totalRemainingToStorno: number // Suma totală rămasă de stornat
}

// Tipurile pentru filtrele din lista de facturi
export interface InvoiceFilters {
  q?: string // Căutare (Nr. Factură, Nume Client)
  status?: string
  eFacturaStatus?: string
  minTotal?: number
  agentId?: string
  clientId?: string
  startDate?: string
  endDate?: string
  series?: string
}
export interface SeriesStat {
  _id: string // Numele seriei
  total: number
  count: number
}
// Tipul pentru o factură "populată" (cu client și agent)
export interface PopulatedInvoice
  extends Omit<
    IInvoiceDoc,
    'clientId' | 'salesAgentId' | 'cancelledBy' | 'cancelledAt'
  > {
  clientId: IClientDoc
  salesAgentId: Pick<IUser, '_id' | 'name'> // Doar ID și nume agent
  cancelledBy?: string | any
  cancellationReason?: string
  cancelledByName?: string
  cancelledAt?: Date | string
}

export type ClientBalanceSummary = {
  clientId: string
  clientName: string
  totalBalance: number
  invoicesCount: number
  invoices: {
    _id: string
    seriesName: string
    invoiceNumber: string
    invoiceDate: Date
    dueDate: Date
    grandTotal: number
    remainingAmount: number
    daysOverdue: number
  }[]
}
