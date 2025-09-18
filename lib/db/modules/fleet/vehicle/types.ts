// modules/vehicle/types.ts

import z from 'zod'
import { VehicleCreateSchema } from './validator'

// — sub‐tipuri
export interface ProductCapacity {
  productCategory: string
  capacity: number
}

export interface VehicleRestrictions {
  hasTrafficRestrictions: boolean
  tonnageRestriction: number
  allowedHours: string
  restrictedZones: string[]
  cityAccessPermission: boolean
}

export interface LoadingUnloadingTimes {
  manual: number
  crane: number
  forklift: number
}

export interface IVehicleAllocationInput {
  vehicle: IVehicleInput
  trips: number
  totalCost: number
}

export interface IVehicleDoc extends Document, IVehicleInput {
  _id: string
  createdBy: {
    userId: string
    name: string
  }
  updatedBy?: {
    userId: string
    name: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface VehicleType {
  name: string
  maxLoadKg: number
  maxVolumeM3: number
  lengthCm: number
  widthCm: number
  heightCm: number
  ratePerKm: number
  carNumber?: string
  carType?: string
  averageConsumption?: number
  year?: number
  brand?: string
  model?: string
  chassisNumber?: string
  notes?: string
  productCapacities?: ProductCapacity[]
  restrictions?: VehicleRestrictions
  loadingUnloadingTimes?: LoadingUnloadingTimes
}

export interface VehicleAllocation {
  vehicle: VehicleType
  trips: number
  totalCost: number
}
export type IVehicleInput = z.infer<typeof VehicleCreateSchema>
