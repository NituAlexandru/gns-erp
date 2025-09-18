import { Model, Schema, model, models } from 'mongoose'
import { IDriverDoc } from './types'
import { CERTIFICATION_TYPES, DRIVER_STATUSES, DRIVING_LICENSE_CATEGORIES } from './validator'

const driverSchema = new Schema<IDriverDoc>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    employmentDate: { type: Date },
    status: {
      type: String,
      enum: DRIVER_STATUSES,
      required: true,
      default: 'Activ',
    },
    drivingLicenses: {
      type: [String],
      enum: DRIVING_LICENSE_CATEGORIES,
      default: [],
    },
    certifications: { type: [String], enum: CERTIFICATION_TYPES, default: [] },
    notes: { type: String },

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

const DriverModel: Model<IDriverDoc> =
  models.Driver || model<IDriverDoc>('Driver', driverSchema)

export default DriverModel
