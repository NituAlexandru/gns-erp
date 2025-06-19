import {
  CartSchema,
  OrderInputSchema,
  OrderItemSchema,
  ProductInputSchema,
  ShippingAddressSchema,
  UserInputSchema,
  UserNameSchema,
  UserSignInSchema,
  UserSignUpSchema,
} from '@/lib/validator'
import { z } from 'zod'

export type IProductInput = z.infer<typeof ProductInputSchema>

export interface PalletType {
  id: string // ID unic, ex: 'EURO-STD-WOOD'
  name: string // Nume afișat, ex: "Custodie Europalet Lemn Standard"
  slug: string // Pentru URL-uri sau referințe, ex: "custodie-europalet-lemn-standard"
  custodyFee: number // Taxa de custodie (prețul paletului)
  lengthCm: number
  widthCm: number
  heightCm: number // Înălțimea paletului GOL
  weightKg: number // Greutatea paletului GOL
  volumeM3: number // Volumul paletului GOL (specificat)
  image: string // Calea către imaginea statică a paletului
  supplier: string
  returnConditions?: string // Opțional
}

export type Data = {
  users: IUserInput[]
  products: IProductInput[]
  headerMenus: {
    name: string
    href: string
  }[]
}
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
export type Cart = z.infer<typeof CartSchema> // se va scoate
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>

// Auto -trb completat cu alocarea exacta a masinilor, dupa numar/sofer
export interface VehicleType {
  name: string
  maxLoadKg: number
  maxVolumeM3: number
  lengthCm: number
  widthCm: number
  heightCm: number
  ratePerKm: number
}

export interface VehicleAllocation {
  vehicle: VehicleType
  trips: number
  totalCost: number
}

// user
export type IUserInput = z.infer<typeof UserInputSchema>
export type IUserSignIn = z.infer<typeof UserSignInSchema>
export type IUserSignUp = z.infer<typeof UserSignUpSchema>
export type IUserName = z.infer<typeof UserNameSchema>
