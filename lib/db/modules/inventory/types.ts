import { Types } from 'mongoose'
import { IDelivery, IInvoice } from '../reception/reception.model'
import { INVENTORY_LOCATIONS, StockMovementType } from './constants'
import { IInventoryItemDoc } from './inventory.model'
import { IStockMovementDoc } from './movement.model'

export interface QualityDetails {
  lotNumbers?: string[]
  certificateNumbers?: string[]
  testReports?: string[]
  additionalNotes?: string
}

// Tipul pentru un lot de cost (folosit în Aviz și Mișcare Stoc)
export interface ICostBreakdownBatch {
  movementId?: Types.ObjectId // ID-ul mișcării de INTRARE
  entryDate: Date
  quantity: number
  unitCost: number
  type: 'REAL' | 'PROVISIONAL'
  supplierId?: Types.ObjectId
  supplierName?: string
  qualityDetails?: QualityDetails
  supplierOrderNumber?: string
  receptionRef?: Types.ObjectId
  orderRef?: Types.ObjectId
}

// Tipul pentru returnul funcției FIFO
export interface FifoCostInfo {
  unitCostFIFO: number // Costul mediu ponderat al ieșirii
  lineCostFIFO: number // Costul total al ieșirii
  costBreakdown: ICostBreakdownBatch[] // Detalierea loturilor
}

export type InventoryItemDTO = Omit<
  IInventoryItemDoc,
  keyof Document | 'stockableItem'
> & {
  _id: string
  stockableItem: string
}

/** DTO for a stock movement, as sent to the client. */
export type StockMovementDTO = Omit<
  IStockMovementDoc,
  keyof Document | 'stockableItem'
> & {
  _id: string
  stockableItem: string
}

export type AggregatedStockItem = {
  _id: string
  totalStock: number
  totalReserved: number
  availableStock: number
  name: string
  unit: string
  productCode: string
  itemType: 'Produs' | 'Ambalaj'
  averageCost: number
  minPrice: number
  maxPrice: number
  lastPrice: number
  packagingOptions: PackagingOption[]
}

export type InventoryLocation = (typeof INVENTORY_LOCATIONS)[number]

export type PopulatedStockMovement = {
  _id: string
  timestamp: string
  movementType: StockMovementType
  balanceBefore: number
  balanceAfter: number
  quantity: number
  unitMeasure?: string
  stockableItem: {
    _id: string
    name: string
    productCode?: string
  } | null
  locationFrom?: InventoryLocation
  locationTo?: InventoryLocation
  responsibleUser: {
    _id: string
    name: string
  } | null
  note?: string
  referenceId?: string
  returnNoteId?:
    | string
    | {
        _id: string
        returnNoteNumber: string
        returnNoteDate: string | Date
      }
    | null
  receptionRef?: string | { _id: string } | null
  supplier?: {
    _id: string
    name: string
  } | null
  clientId?: {
    _id: string
    name: string
  } | null
  documentNumber?: string
  qualityDetails?: QualityDetails | null
  // Detalii Costuri & Trasabilitate
  costBreakdown?: {
    entryDate?: string | Date
    quantity: number
    unitCost: number
    batchSnapshot?: {
      supplierName?: string
      qualityDetails?: QualityDetails
    }
  }[]

  unitCost?: number
  lineCost?: number

  createdAt?: string | Date
  updatedAt?: string | Date
}
export interface PackagingOption {
  unitName: string
  baseUnitEquivalent: number
}

export interface Batch {
  _id: string
  quantity: number
  unitCost: number
  entryDate: string | Date
  movementId: string
  supplierId?: string | { _id: string; name: string } | null
  qualityDetails?: QualityDetails
  receptionRef?: string | null // ID-ul Recepției
  orderRef?: string | null // ID-ul Comenzii
  supplierOrderNumber?: string | null // Referința Furnizor
}
// 2. Tipul STRICT pentru Batch-ul care ajunge în Frontend (Populat)
export interface PopulatedBatch
  extends Omit<Batch, 'supplierId' | 'movementId'> {
  movementId: string
  supplierId?: {
    _id: string
    name: string
  } | null
}

export interface StockLocationEntry {
  _id: string
  location: InventoryLocation
  batches: PopulatedBatch[]
  totalStock: number
  quantityReserved: number
}

export interface ProductStockDetails {
  _id: string
  name: string
  productCode?: string
  unit?: string
  packagingUnit?: string
  locations: StockLocationEntry[]
  packagingOptions: PackagingOption[]
}
interface PopulatedReceptionItem {
  _id: string
  product?: {
    _id: string
    name: string
    productCode?: string
    unit: string
    packagingUnit?: string | null
    packagingQuantity?: number | null
    itemsPerPallet?: number | null
  }
  packaging?: {
    _id: string
    name: string
    productCode?: string
    packagingUnit: string
    packagingQuantity?: number | null
    itemsPerPallet?: number | null
  }
  quantity: number
  unitMeasure: string
  landedCostPerUnit: number
}

export interface ReferenceDetails {
  _id: string
  supplier?: { name: string }
  createdBy?: { name: string }
  receptionDate: string | Date
  products: PopulatedReceptionItem[]
  packagingItems: PopulatedReceptionItem[]
  invoices: IInvoice[]
  deliveries: IDelivery[]
}

export interface StockMovementDetails {
  movement: PopulatedStockMovement
  reference: ReferenceDetails | null
}
