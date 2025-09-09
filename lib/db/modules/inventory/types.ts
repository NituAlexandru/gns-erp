// types.ts
import { INVENTORY_LOCATIONS, StockMovementType } from './constants'
import { IInventoryItemDoc } from './inventory.model'
import { IStockMovementDoc } from './movement.model'

/** DTO for an inventory item, as sent to the client. */
export type InventoryItemDTO = Omit<
  IInventoryItemDoc,
  keyof Document | 'stockableItem'
> & {
  _id: string
  stockableItem: string // a simple string ID
}

/** DTO for a stock movement, as sent to the client. */
export type StockMovementDTO = Omit<
  IStockMovementDoc,
  keyof Document | 'stockableItem'
> & {
  _id: string
  stockableItem: string // a simple string ID
}

export type AggregatedStockItem = {
  _id: string
  totalStock: number
  name: string
  unit: string
  productCode: string
}

export type InventoryLocation = (typeof INVENTORY_LOCATIONS)[number]

export type PopulatedStockMovement = {
  _id: string
  timestamp: string // sau Date
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
