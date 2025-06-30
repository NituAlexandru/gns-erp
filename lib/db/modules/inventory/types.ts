import { InventoryLocation } from './constants'



export interface IInventoryItem {
  _id: string
  product: string // ObjectId of ERPProduct
  location: InventoryLocation
  quantityOnHand: number
  quantityReserved: number
  createdAt: Date
  updatedAt: Date
}

export interface IStockMovement {
  _id: string
  product: string // ObjectId of ERPProduct
  movementType: string
  quantity: number
  locationFrom?: InventoryLocation
  locationTo?: InventoryLocation
  referenceId?: string // e.g. orderId or PO id
  note?: string
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

export type StockMovementInput = Omit<
  IStockMovement,
  '_id' | 'createdAt' | 'updatedAt'
> & { movementType: string }
