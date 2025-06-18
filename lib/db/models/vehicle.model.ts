import { Schema } from 'mongoose'

// Schema pentru tipul de vehicul
export const VehicleTypeSchema = new Schema(
  {
    name: { type: String, required: true },
    maxLoadKg: { type: Number, required: true },
    maxVolumeM3: { type: Number, required: true },
    lengthCm: { type: Number, required: true },
    widthCm: { type: Number, required: true },
    heightCm: { type: Number, required: true },
    ratePerKm: { type: Number, required: true },
  },
  { _id: false } // ca să nu creeze un _id pentru sub-schema
)

// Schema pentru alocarea vehiculului
export const VehicleAllocationSchema = new Schema(
  {
    vehicle: { type: VehicleTypeSchema, required: true },
    trips: { type: Number, required: true },
    totalCost: { type: Number, required: true },
  },
  { _id: false }
)
