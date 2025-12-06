import {
  DeliveryNoteStatusKey,
  ETransportStatusKey,
} from './delivery-note.constants'

export interface CostBreakdownDTO {
  movementId: string
  entryDate: string
  quantity: number
  unitCost: number
}

export interface DeliveryNoteLineDTO {
  orderLineItemId?: string
  productId?: string
  serviceId?: string
  stockableItemType?: 'ERPProduct' | 'Packaging'
  isManualEntry: boolean
  isPerDelivery?: boolean
  productName: string
  productCode: string
  productBarcode?: string
  quantity: number
  unitOfMeasure: string
  unitOfMeasureCode?: string
  priceAtTimeOfOrder: number
  minimumSalePrice?: number
  lineValue: number
  lineVatValue: number
  lineTotal: number
  vatRateDetails: { rate: number; value: number }
  baseUnit?: string
  conversionFactor?: number
  quantityInBaseUnit?: number
  priceInBaseUnit?: number
  packagingOptions: { unitName: string; baseUnitEquivalent: number }[]
  unitCostFIFO?: number
  lineCostFIFO?: number
  costBreakdown?: CostBreakdownDTO[]
}

export interface DeliveryNoteTotalsDTO {
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

export interface CompanySnapshotDTO {
  name: string
  cui: string
  regCom: string
  address: {
    judet: string
    localitate: string
    strada: string
    numar?: string
    codPostal: string
    tara: string
    alteDetalii?: string
  }
  email: string
  phone: string
  bank: string
  iban: string
  currency: string
}

export interface DeliveryNoteDTO {
  _id: string
  noteNumber: string
  seriesName: string
  sequenceNumber: number
  year: number
  deliveryId: string
  orderId: string
  orderNumberSnapshot: string
  deliveryNumberSnapshot: string
  relatedInvoices: {
    invoiceId: string
    invoiceNumber: string
    details?: string
  }[]
  clientId: string
  status: DeliveryNoteStatusKey
  isInvoiced: boolean
  createdBy: string
  createdByName: string
  lastUpdatedBy?: string
  lastUpdatedByName?: string
  companySnapshot: CompanySnapshotDTO
  clientSnapshot: {
    name: string
    cui: string
    regCom: string
    address: string
    judet: string
    bank?: string
    iban?: string
  }
  deliveryAddress: {
    judet: string
    localitate: string
    strada: string
    numar: string
    codPostal: string
    alteDetalii?: string
    tara?: string
    persoanaContact?: string
    telefonContact?: string
  }
  salesAgentSnapshot: { name: string }
  driverName?: string
  vehicleNumber?: string
  vehicleType?: string
  deliveryType?: string
  trailerNumber?: string
  deliveryDate?: string
  deliverySlots?: string[]
  orderNotesSnapshot?: string
  deliveryNotesSnapshot?: string
  items: DeliveryNoteLineDTO[]
  totals: DeliveryNoteTotalsDTO
  eTransportStatus: ETransportStatusKey
  eTransportCode?: string
  vehicleRegistration?: string
  transportCompany?: string
  createdAt: string
  updatedAt: string
}

// -------------------------------------------------------------
// Populated (expanded) types
// -------------------------------------------------------------

export interface PopulatedDeliveryNote extends DeliveryNoteDTO {
  delivery?: {
    _id: string
    deliveryNumber: string
    status: string
  }
  order?: {
    _id: string
    orderNumber: string
    clientName: string
  }
  createdByUser?: {
    _id: string
    name: string
  }
}

// -------------------------------------------------------------
// Utility types
// -------------------------------------------------------------

export interface CreateDeliveryNoteInput {
  deliveryId: string
  orderId: string
  clientId: string
  createdBy: string
  createdByName: string
  items: DeliveryNoteLineDTO[]
  totals: DeliveryNoteTotalsDTO
  seriesName: string
}

export interface UpdateDeliveryNoteStatusInput {
  deliveryNoteId: string
  status: DeliveryNoteStatusKey
  updatedBy: string
  updatedByName: string
}

// Cazul de succes
type CreateNoteSuccess = {
  success: true
  data: DeliveryNoteDTO
}

// Cazul când e nevoie de selecție
type CreateNoteSelectionRequired = {
  success: false
  requireSelection: true
  message: string
  series: string[]
}

// Cazul de eroare generică
type CreateNoteError = {
  success: false
  requireSelection?: false
  message: string
}

// Tipul final care le unește pe toate
export type CreateDeliveryNoteResult =
  | CreateNoteSuccess
  | CreateNoteSelectionRequired
  | CreateNoteError
