import { Types } from 'mongoose'

export interface IPriceEvent {
  _id: string
  product: Types.ObjectId // ObjectId of ERPProduct
  productName: string // snapshot, so you can display without another lookup
  eventType: 'PURCHASE' | 'SALE'
  unitPrice: number // price per unit
  quantity: number // how many units were bought/sold
  total: number // unitPrice * quantity
  referenceId?: string // e.g. PO id or order id
  timestamp: Date // when the event happened
  createdAt: Date
  updatedAt: Date
}

/**
 * What the caller passes in when recording a new price event.
 */
export type PriceEventInput = Omit<
  IPriceEvent,
  '_id' | 'createdAt' | 'updatedAt'
>
