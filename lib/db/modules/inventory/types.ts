// types.ts
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
