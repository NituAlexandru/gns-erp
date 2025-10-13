import { Document, Model, model, models, Schema } from 'mongoose'

export interface IVehicleRateDoc extends Document {
  name: string
  type: string
  ratePerKm: number
}

const vehicleRateSchema = new Schema<IVehicleRateDoc>({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true, unique: true },
  ratePerKm: { type: Number, required: true, default: 0 },
})

const VehicleRate: Model<IVehicleRateDoc> =
  models.VehicleRate || model<IVehicleRateDoc>('VehicleRate', vehicleRateSchema)

export default VehicleRate
