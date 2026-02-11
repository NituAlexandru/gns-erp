import { Types } from 'mongoose'
import { NirStatusKey } from './nir.constants'

// --- Snapshots ---

export interface CompanySnapshotDTO {
  name: string
  cui: string
  regCom?: string
  address?: any
  bankAccounts?: any
  phones?: any
  emails?: any
  capitalSocial?: string
}
export interface SupplierSnapshotDTO {
  name: string
  cui: string
}
export interface QualityDetails {
  lotNumbers: string[]
  certificateNumbers: string[]
  testReports: string[]
  additionalNotes?: string
}
// --- Detalii Linii NIR ---

export interface NirLineDTO {
  receptionLineId?: string
  stockableItemType: 'ERPProduct' | 'Packaging'
  productId?: Types.ObjectId | string
  packagingId?: Types.ObjectId | string
  productName: string
  productCode?: string
  unitMeasure: string
  documentQuantity: number
  quantity: number
  quantityDifference: number
  invoicePricePerUnit: number
  vatRate: number
  distributedTransportCostPerUnit: number
  landedCostPerUnit: number
  lineValue: number
  lineVatValue: number
  lineTotal: number
  qualityDetails?: QualityDetails
}

// Structura de Totaluri (DeliveryNote Style)
export interface NirTotalsDTO {
  productsSubtotal: number
  productsVat: number
  packagingSubtotal: number
  packagingVat: number
  transportSubtotal: number
  transportVat: number
  subtotal: number // Total net factură
  vatTotal: number // Total TVA factură
  grandTotal: number // Total brut factură (de plată furnizor)
  totalEntryValue: number // Valoare de intrare în stoc (grandTotal + transport net, sau similar, depinde de logica ta exactă de cost)
}

// --- Documentul Principal ---

export interface NirDTO {
  _id: string
  nirNumber: string
  seriesName: string
  sequenceNumber: number
  year: number
  nirDate: string
  receptionId: string[]
  supplierId: string
  invoices: {
    series?: string
    number: string
    date: string
    amount?: number
    currency?: string
    vatRate?: number
    vatValue?: number
    totalWithVat?: number
  }[]
  deliveries: {
    dispatchNoteSeries?: string
    dispatchNoteNumber: string
    dispatchNoteDate: string
    driverName?: string
    carNumber?: string
    transportType?: string
    transportCost?: number
    transportVatRate?: number
    transportVatValue?: number
    tertiaryTransporterDetails?: {
      name?: string
      cui?: string
      regCom?: string
    }
  }[]
  companySnapshot: CompanySnapshotDTO
  supplierSnapshot: SupplierSnapshotDTO
  receivedBy: { userId: string; name: string }
  items: NirLineDTO[]
  totals: NirTotalsDTO
  status: NirStatusKey
  cancellationReason?: string
  cancelledAt?: string
  cancelledBy?: string
  cancelledByName?: string
  destinationLocation: string
  orderRef?: string | null
  createdAt: string
  updatedAt: string
}

// --- Helpers pt Receptie ---
export interface ReceptionItemData {
  _id?: Types.ObjectId | string
  quantity: number
  documentQuantity?: number
  invoicePricePerUnit?: number
  vatRate?: number
  landedCostPerUnit?: number
  distributedTransportCostPerUnit?: number
  unitMeasure: string

  product?:
    | { _id: string | Types.ObjectId; name?: string; productCode?: string }
    | string
    | Types.ObjectId
  productName?: string
  productCode?: string
  stockableItemType?: 'ERPProduct' | 'Packaging' // Adăugat pentru a fi siguri

  packaging?:
    | { _id: string | Types.ObjectId; name?: string; productCode?: string }
    | string
    | Types.ObjectId
  packagingName?: string
  packagingCode?: string
}

// Type wrapper pentru Frontend (dacă totuși ai nevoie pentru selectorul de serii)
export type CreateNirResult =
  | { success: true; data: NirDTO }
  | {
      success: false
      requireSelection: true
      message: string
      series: string[]
    }
  | { success: false; requireSelection?: false; message: string }
