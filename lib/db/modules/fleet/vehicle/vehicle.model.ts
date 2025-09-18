// lib/db/modules/fleet/vehicle/model.ts
import { Model, Schema, model, models } from 'mongoose'
import { IVehicleDoc } from './types'
import { VEHICLE_TYPE_NAMES } from './constants' // ✅ Importăm lista de NUME

const vehicleSchema = new Schema<IVehicleDoc>(
  {
    name: { type: String, required: true },
    carNumber: { type: String, required: true, unique: true, sparse: true },
    carType: { type: String, enum: VEHICLE_TYPE_NAMES, required: true },
    brand: { type: String },
    model: { type: String },
    year: { type: Number },
    chassisNumber: { type: String },
    maxLoadKg: { type: Number, required: true },
    maxVolumeM3: { type: Number, required: true },
    lengthCm: { type: Number, required: true },
    widthCm: { type: Number, required: true },
    heightCm: { type: Number, required: true },
    permanentTrailerId: { type: Schema.Types.ObjectId, ref: 'Trailer' },
    ratePerKm: { type: Number, required: true },
    averageConsumption: { type: Number },
    notes: { type: String },
    // restrictions: {
    //   hasTrafficRestrictions: { type: Boolean },
    //   tonnageRestriction: { type: Number },
    //   allowedHours: { type: String },
    //   restrictedZones: { type: [String] },
    //   cityAccessPermission: { type: Boolean },
    // },
    // loadingUnloadingTimes: {
    //   manual: { type: Number },
    //   crane: { type: Number },
    //   forklift: { type: Number },
    // },
    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    updatedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
    },
  },
  { timestamps: true }
)

const VehicleModel: Model<IVehicleDoc> =
  models.Vehicle || model<IVehicleDoc>('Vehicle', vehicleSchema)
export default VehicleModel
