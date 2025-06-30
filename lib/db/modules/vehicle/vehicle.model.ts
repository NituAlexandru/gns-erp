import { Schema, model, models } from 'mongoose'
import { IVehicleDoc } from './types'

// 1) reutilizăm exact definiția de schema (fără generice complicate)
const vehicleSchema = new Schema(
  {
    name: { type: String, required: true },
    maxLoadKg: { type: Number, required: true },
    maxVolumeM3: { type: Number, required: true },
    lengthCm: { type: Number, required: true },
    widthCm: { type: Number, required: true },
    heightCm: { type: Number, required: true },
    ratePerKm: { type: Number, required: true },
    carNumber: { type: String, required: false },
    carDriver: { type: String },
    carType: { type: String },
    averageConsumption: { type: Number, default: 0 },
    year: { type: Number, default: 0 },
    brand: { type: String },
    model: { type: String },
    chassisNumber: { type: String },
    notes: { type: String },
    restrictions: {
      hasTrafficRestrictions: { type: Boolean, default: false },
      tonnageRestriction: { type: Number, default: 0 },
      allowedHours: { type: String, default: '' },
      restrictedZones: [{ type: String }],
      cityAccessPermission: { type: Boolean, default: true },
    },
    loadingUnloadingTimes: {
      manual: { type: Number, default: 0 },
      crane: { type: Number, default: 0 },
      forklift: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
)

// 2) indexuri
vehicleSchema.index({ carNumber: 1 }, { unique: true })
vehicleSchema.index({ name: 1 })
vehicleSchema.index({ carDriver: 1 })
vehicleSchema.index({ model: 1 })

// 3) export model
const VehicleModel =
  models.Vehicle || model<IVehicleDoc>('Vehicle', vehicleSchema)
export default VehicleModel
