import { z } from 'zod'
import { HeaderSchema } from './validator'
import { IOrder } from '../order/order.model'
import { Types } from 'mongoose'

export type DeliveryStatusKey =
  | 'CREATED' // Creata (starea inițială, creată de tine)
  | 'SCHEDULED' // Programată (starea dupa ce a fost programata livrarea)
  | 'IN_TRANSIT' // În Tranzit (când se generează Avizul)
  | 'DELIVERED' // Livrată (confirmată manual)
  | 'INVOICED' // Facturată
  | 'CANCELLED' // Anulată (dacă e cazul)

// --- Tipuri Snapshot ---
export interface ClientSnapshot {
  name: string
  cui: string
  regCom: string
  address: string
  judet: string
  bank?: string
  iban?: string
  balanceAtCreation?: number
  statusAtCreation?: string
}
export interface SalesAgentSnapshot {
  name: string
}
export interface DeliveryAddress {
  judet: string
  localitate: string
  strada: string
  numar: string
  codPostal: string
  alteDetalii?: string
}
// --- Sfârșit Tipuri Snapshot ---

// Tipul PackagingOption
export type PackagingOption = {
  unitName: string
  baseUnitEquivalent: number
}

// Tipul pentru o linie extrasă din IOrder
export type IOrderLineItem = IOrder['lineItems'][number]

export type PlannerItem = {
  id: string
  orderLineItemId: string | null
  productId: string | null
  serviceId: string | null
  stockableItemType: 'ERPProduct' | 'Packaging' | null
  productName: string
  productCode: string | null
  isManualEntry: boolean
  quantityOrdered: number
  quantityAlreadyShipped: number
  quantityAlreadyPlanned: number
  unitOfMeasure: string
  unitOfMeasureCode: string | null
  baseUnit: string
  packagingOptions: PackagingOption[]
  quantityToAllocate: number
  priceAtTimeOfOrder: number
  priceInBaseUnit: number
  vatRateDetails: { rate: number }
}

export type PlannedDelivery = {
  id: string
  deliveryNumber?: string
  status: DeliveryStatusKey
  requestedDeliveryDate: Date
  requestedDeliverySlots: string[]
  deliveryDate?: Date
  deliverySlots?: string[]
  items: PlannerItem[]
  deliveryNotes?: string
  uitCode?: string
}

export interface NewDeliveryLineData {
  orderLineItemId?: Types.ObjectId
  productId?: Types.ObjectId
  serviceId?: Types.ObjectId
  isManualEntry: boolean
  isPerDelivery?: boolean
  productName: string
  productCode: string
  quantity: number
  unitOfMeasure: string
  unitOfMeasureCode?: string
  priceAtTimeOfOrder: number
  minimumSalePrice?: number
  lineValue: number
  lineVatValue: number
  lineTotal: number
  vatRateDetails: { rate: number; value: number }
  stockableItemType?: 'ERPProduct' | 'Packaging'
  baseUnit?: string
  conversionFactor?: number
  quantityInBaseUnit?: number
  priceInBaseUnit?: number
  packagingOptions: PackagingOption[]
}

// Interfață simplă pt document nou (backend)
export interface NewDeliveryData {
  orderId: Types.ObjectId
  orderNumber: string
  client: Types.ObjectId
  clientSnapshot: ClientSnapshot
  salesAgent: Types.ObjectId
  salesAgentSnapshot: SalesAgentSnapshot
  deliveryAddress: DeliveryAddress
  deliveryAddressId: Types.ObjectId
  requestedDeliveryDate: Date
  requestedDeliverySlots: string[]
  deliveryDate?: Date
  deliverySlots?: string[]
  vehicleType: string
  deliveryType: string
  isThirdPartyHauler: boolean
  deliveryNotes?: string
  orderNotes?: string
  uitCode?: string
  createdBy: Types.ObjectId
  createdByName: string
  lastUpdatedBy?: Types.ObjectId
  lastUpdatedByName?: string
  assemblyId?: Types.ObjectId
  driverName?: string
  vehicleNumber?: string
  trailerNumber?: string
  items: NewDeliveryLineData[]
  totals: {
    productsSubtotal: number
    productsVat: number
    servicesSubtotal: number
    servicesVat: number
    manualSubtotal: number
    manualVat: number
    subtotal: number
    vatTotal: number
    grandTotal: number
  }
}
export type CompanyAddressSnapshot = {
  judet: string
  localitate: string
  strada: string
  numar?: string
  codPostal: string
  tara?: string
  alteDetalii?: string
}
// Tipul final pentru insert (backend)
export type DeliveryDataForInsert = NewDeliveryData & {
  deliveryNumber: string
  status: 'CREATED'
}

// Tipul pentru Header (client)
export type HeaderInput = z.infer<typeof HeaderSchema>
