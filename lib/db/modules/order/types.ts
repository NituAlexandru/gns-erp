import { z } from 'zod'
import { Types } from 'mongoose'
import { IOrder } from './order.model'
import { CreateOrderInputSchema, OrderLineItemInputSchema } from './validator'

export interface IOrderLineItem extends Types.Subdocument {
  productId?: Types.ObjectId
  serviceId?: Types.ObjectId
  isManualEntry: boolean
  isPerDelivery?: boolean
  productName: string
  productCode?: string
  quantity: number
  unitOfMeasure: string
  unitOfMeasureCode?: string
  priceAtTimeOfOrder: number
  minimumSalePrice?: number
  lineValue: number
  lineVatValue: number
  lineTotal: number
  vatRateDetails: {
    rate: number
    value: number
  }
  codNC?: string
  codCPV?: string
  quantityShipped: number
  stockableItemType?: 'ERPProduct' | 'Packaging'
  baseUnit?: string
  conversionFactor?: number
  quantityInBaseUnit?: number
  priceInBaseUnit?: number
}

// Tipul de date pentru formularul de creare a unei comenzi
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>

// Tipul de date pentru o singură linie din formularul de comandă
export type OrderLineItemInput = z.infer<typeof OrderLineItemInputSchema>

export type FullOrder = IOrder & {
  _id: string
}
export type PopulatedOrder = Omit<IOrder, 'client'> & {
  client: {
    _id: string
    name: string
  } | null
  salesAgent: {
    _id: string
    name: string
  } | null
}

export { CreateOrderInputSchema }

export type OrderStatusKey = IOrder['status']

export interface OrderFilters {
  q?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  minTotal?: number
}
