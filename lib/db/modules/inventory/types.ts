import { INVENTORY_LOCATIONS, StockMovementType } from './constants'
import { IInventoryItemDoc } from './inventory.model'
import { IStockMovementDoc } from './movement.model'

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
  name: string
  unit: string
  productCode: string
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
}
export interface PackagingOption {
  unitName: string
  baseUnitEquivalent: number
}

export interface Batch {
  quantity: number
  unitCost: number
  entryDate: string | Date
  movementId: string
}

export interface StockLocationEntry {
  location: InventoryLocation
  batches: Batch[]
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
