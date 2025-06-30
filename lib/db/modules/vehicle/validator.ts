// modules/vehicle/validator.ts
import { z } from 'zod'

// Refolosim regex‐ul MongoID
const MongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'ID MongoDB invalid')

// 1) sub‐schema pentru restricții
export const VehicleRestrictionsSchema = z.object({
  hasTrafficRestrictions: z.boolean().default(false),
  tonnageRestriction: z.number().nonnegative().default(0),
  allowedHours: z.string().default(''),
  restrictedZones: z.array(z.string()).default([]),
  cityAccessPermission: z.boolean().default(true),
})

// 2) sub‐schema pentru timpi
export const LoadingUnloadingTimesSchema = z.object({
  manual: z.number().nonnegative().default(0),
  crane: z.number().nonnegative().default(0),
  forklift: z.number().nonnegative().default(0),
})

// 3) schema principală de creare vehicul
export const VehicleCreateSchema = z.object({
  name: z.string().min(1),
  maxLoadKg: z.number().nonnegative(),
  maxVolumeM3: z.number().nonnegative(),
  lengthCm: z.number().nonnegative(),
  widthCm: z.number().nonnegative(),
  heightCm: z.number().nonnegative(),
  ratePerKm: z.number().nonnegative(),
  carNumber: z.string().min(1),
  carType: z.string().optional(),
  averageConsumption: z.number().nonnegative().optional(),
  year: z.number().int().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  chassisNumber: z.string().optional(),
  notes: z.string().optional(),

  productCapacities: z
    .array(
      z.object({
        productCategory: z.string().min(1),
        capacity: z.number().nonnegative(),
      })
    )
    .optional(),
  restrictions: VehicleRestrictionsSchema.optional(),
  loadingUnloadingTimes: LoadingUnloadingTimesSchema.optional(),
})

// 4) schema de update (adaugă _id)
export const VehicleUpdateSchema = VehicleCreateSchema.extend({
  _id: MongoId,
})

// 5) schema pentru alocare
export const VehicleAllocationSchema = z.object({
  vehicle: VehicleCreateSchema,
  trips: z.number().int().positive(),
  totalCost: z.number().nonnegative(),
})

// 6) tipuri inferrate
export type CreateVehicleInput = z.infer<typeof VehicleCreateSchema>
export type UpdateVehicleInput = z.infer<typeof VehicleUpdateSchema>
export type VehicleAllocationInput = z.infer<typeof VehicleAllocationSchema>
