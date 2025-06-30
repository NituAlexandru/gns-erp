import { z } from 'zod'
import {
  CartSchema,
  OrderInputSchema,
  OrderItemSchema,
  ShippingAddressSchema,
} from './validator'

// Order
export type IOrderInput = z.infer<typeof OrderInputSchema>
export type IOrderList = IOrderInput & {
  _id: string
  user: {
    name: string
    email: string
  }
  vehicleAllocation: {
    vehicle: { name: string }
    trips: number
    totalCost: number
  }
  createdAt: Date
}
export type OrderItem = z.infer<typeof OrderItemSchema>
export type Cart = z.infer<typeof CartSchema>
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>
