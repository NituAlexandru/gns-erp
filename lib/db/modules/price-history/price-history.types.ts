import { StockMovementType } from '../inventory/constants'

export type PriceRecordParams = {
  stockableItem: string
  stockableItemType: 'ERPProduct' | 'Packaging'
  productSnapshot: {
    name: string
    code: string
    baseUnit: string
  }
  partner: {
    _id: string
    name: string
  }
  referenceId: string
  date: Date

  transactionType: StockMovementType

  unitMeasure: string
  user: {
    _id: string
    name: string
  }
  priceDetails: {
    netPrice: number
    vatRate: number
    vatValue: number
    grossPrice: number
  }
}
export interface IPriceHistoryEntry {
  date: Date
  partner: { _id: string; name: string }
  transactionType: string
  unitMeasure: string
  netPrice: number
  vatRate: number
  grossPrice: number
}
export interface IProductPriceHistory {
  purchases: IPriceHistoryEntry[]
  sales: IPriceHistoryEntry[]
}
