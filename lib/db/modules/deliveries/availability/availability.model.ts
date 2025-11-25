import { Schema, model, models, Document, Model, Types } from 'mongoose'
import { DELIVERY_SLOTS } from '../constants'

export interface IFleetAvailabilityDoc extends Document {
  _id: Types.ObjectId
  assignmentId: Types.ObjectId
  date: Date
  slots: string[]
  type: 'ITP' | 'SERVICE' | 'CONCEDIU' | 'ALTELE'
  note?: string
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
}

const FleetAvailabilitySchema = new Schema<IFleetAvailabilityDoc>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    slots: {
      type: [String],
      enum: DELIVERY_SLOTS,
      required: true,
    },
    type: {
      type: String,
      enum: ['ITP', 'SERVICE', 'CONCEDIU', 'ALTELE'],
      default: 'ALTELE',
    },
    note: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

const FleetAvailabilityModel: Model<IFleetAvailabilityDoc> =
  models.FleetAvailability ||
  model<IFleetAvailabilityDoc>('FleetAvailability', FleetAvailabilitySchema)

export default FleetAvailabilityModel
