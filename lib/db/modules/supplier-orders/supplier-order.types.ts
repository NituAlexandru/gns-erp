import { Document, Types } from 'mongoose'
import { ITertiaryTransporter } from '../reception/reception.model'
import { SupplierOrderStatus } from './supplier-order.constants'

export type ActionResultWithData<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string }

export type ActionResult =
  | { success: true; message: string }
  | { success: false; message: string }

export interface InputLineItem {
  product?: string | Types.ObjectId
  packaging?: string | Types.ObjectId
  quantityOrdered: number
  unitMeasure: string
  pricePerUnit: number
  vatRate: number
  // Câmpuri opționale care vin din form (hidden fields)
  productName?: string
  packagingName?: string
  productCode?: string
  // Câmpuri originale pentru logică
  originalQuantity?: number
  originalUnitMeasure?: string
  originalPricePerUnit?: number
  [key: string]: unknown
}

// Tip helper pentru datele extrase rapid din DB (Produse/Ambalaje)
export interface IDbItemInfo {
  _id: string
  unit: string
  packagingUnit?: string
  packagingQuantity?: number
  itemsPerPallet?: number
}

// Structura completă a adresei din Furnizor
export interface ISupplierAddress {
  judet: string
  localitate: string
  strada: string
  numar: string
  codPostal: string
  alteDetalii?: string
  tara?: string
  persoanaContact?: string
  telefonContact?: string
  distanceInKm?: number
  travelTimeInMinutes?: number
  isActive?: boolean
}

// Folosim aceeași structură și pentru loading addresses
export interface ILoadingAddress extends ISupplierAddress {
  _id: string
}

// Interfața completă returnată de getFullSupplierDetails
export interface IFullSupplierDetails {
  _id: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  address: ISupplierAddress
  loadingAddresses: ILoadingAddress[]
}

export interface ISupplierSnapshot {
  name: string
  cui?: string
  regCom?: string
  address: {
    judet?: string
    localitate?: string
    strada?: string
    numar?: string
    codPostal?: string
    alteDetalii?: string
  }
  iban?: string
  bank?: string
  contactName?: string
  phone?: string
}

export interface IOrderTransportDetails {
  transportType: 'INTERN' | 'EXTERN_FURNIZOR' | 'TERT'
  transportCost: number
  estimatedTransportCount: number
  totalTransportCost: number
  transportVatRate: number
  transportVatValue: number
  transportTotalWithVat: number
  distanceInKm?: number
  travelTimeInMinutes?: number
  tertiaryTransporterDetails?: ITertiaryTransporter
  driverName?: string
  carNumber?: string
  notes?: string
}

export interface ISupplierOrderItem {
  _id?: string
  product: Types.ObjectId | string
  productName: string
  productCode?: string
  quantityOrdered: number
  quantityReceived: number
  unitMeasure: string
  unitMeasureCode?: string
  pricePerUnit: number
  originalQuantity?: number
  originalUnitMeasure?: string
  originalPricePerUnit?: number
  lineTotal: number
  vatRate: number
  vatValue: number
}

export interface ISupplierOrderPackagingItem {
  _id?: string
  packaging: Types.ObjectId | string
  packagingName: string
  productCode?: string
  quantityOrdered: number
  quantityReceived: number
  unitMeasure: string
  unitMeasureCode?: string
  pricePerUnit: number
  originalQuantity?: number
  originalUnitMeasure?: string
  originalPricePerUnit?: number
  lineTotal: number
  vatRate: number
  vatValue: number
}

export interface ILinkedReception {
  receptionId: Types.ObjectId | string
  receptionNumber: string
  receptionDate: Date
  totalValue: number
}

// Documentul principal
export interface ISupplierOrderDoc extends Document {
  _id: string
  orderNumber: string
  supplierOrderNumber?: string
  supplierOrderDate?: Date
  orderDate: Date
  supplier: Types.ObjectId | string
  supplierSnapshot: ISupplierSnapshot
  createdBy: Types.ObjectId
  createdByName: string
  destinationType: 'DEPOZIT' | 'PROIECT'
  destinationLocation: string
  destinationId?: Types.ObjectId
  transportDetails: IOrderTransportDetails
  products: ISupplierOrderItem[]
  packagingItems: ISupplierOrderPackagingItem[]
  receptions: ILinkedReception[]
  currency: 'RON' | 'EUR' | 'USD'
  exchangeRate: number
  totalValue: number
  totalVat: number
  grandTotal: number
  status: SupplierOrderStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface GetOrdersParams {
  page?: number
  limit?: number
  status?: string
  q?: string
}
