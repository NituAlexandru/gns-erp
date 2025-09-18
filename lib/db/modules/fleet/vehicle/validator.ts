// lib/db/modules/fleet/vehicle/validator.ts
import { z } from 'zod'
import { VEHICLE_TYPE_NAMES } from './constants'

export const VehicleRestrictionsSchema = z.object({
  hasTrafficRestrictions: z.boolean().default(false),
  tonnageRestriction: z.number().nonnegative().default(0),
  allowedHours: z.string().default(''),
  restrictedZones: z.array(z.string()).default([]),
  cityAccessPermission: z.boolean().default(true),
})

export const LoadingUnloadingTimesSchema = z.object({
  manual: z.number().nonnegative().default(0),
  crane: z.number().nonnegative().default(0),
  forklift: z.number().nonnegative().default(0),
})

const BaseVehicleSchema = z.object({
  name: z.string().min(3, 'Numele trebuie să aibă cel puțin 3 caractere'),
  carNumber: z.string().min(4, 'Numărul de înmatriculare este obligatoriu'),
  carType: z.enum(VEHICLE_TYPE_NAMES, {
    errorMap: () => ({ message: 'Te rog selectează un tip valid de vehicul.' }),
  }),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  chassisNumber: z.string().optional(),
  maxLoadKg: z.number().positive('Sarcina utilă trebuie să fie pozitivă'),
  maxVolumeM3: z.number().positive('Volumul trebuie să fie pozitiv'),
  lengthCm: z.number().int().positive('Dimensiunile trebuie să fie pozitive'),
  widthCm: z.number().int().positive('Dimensiunile trebuie să fie pozitive'),
  heightCm: z.number().int().positive('Dimensiunile trebuie să fie pozitive'),
  permanentTrailerId: z.string().optional(),
  ratePerKm: z.number().nonnegative('Tariful pe km nu poate fi negativ'),
  averageConsumption: z.number().nonnegative().optional(),
  notes: z.string().optional(),
})

export const VehicleCreateSchema = BaseVehicleSchema
export const VehicleUpdateSchema = BaseVehicleSchema.extend({
  _id: z.string().min(1, 'ID-ul este necesar'),
})
