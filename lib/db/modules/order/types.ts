import { z } from 'zod'
import { Types } from 'mongoose'
import { IOrder } from './order.model'
import { CreateOrderInputSchema, OrderLineItemInputSchema } from './validator'
import { IDelivery } from '../deliveries/delivery.model'

export interface IOrderLineItem extends Types.Subdocument {
  productId?: Types.ObjectId
  serviceId?: Types.ObjectId
  isManualEntry: boolean
  isPerDelivery?: boolean
  productName: string
  productCode?: string
  productBarcode?: string
  quantity: number
  unitOfMeasure: string
  unitOfMeasureCode?: string
  priceAtTimeOfOrder: number
  cost?: number
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
  packagingOptions?: {
    unitName: string
    baseUnitEquivalent: number
  }[]
  weight?: number
  volume?: number
  length?: number
  width?: number
  height?: number
  packagingUnit?: string
  packagingQuantity?: number
}

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>
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
  lineItems: (Omit<IOrderLineItem, '_id' | 'productId' | 'serviceId'> & {
    _id: string
    productId?: string | null
    serviceId?: string | null
  })[]
  deliveries?: IDelivery[]
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
