import { Model, Schema, model, models } from 'mongoose'
import { ITrailerDoc } from './types'
import { TRAILER_TYPES } from './validator'

const trailerSchema = new Schema<ITrailerDoc>(
  {
    name: { type: String, required: true },
    licensePlate: { type: String, required: true, unique: true, sparse: true },
    type: { type: String, enum: TRAILER_TYPES, required: true },

    maxLoadKg: { type: Number, required: true },
    maxVolumeM3: { type: Number, required: true },
    lengthCm: { type: Number, required: true },
    widthCm: { type: Number, required: true },
    heightCm: { type: Number, required: true },

    year: { type: Number },
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

const TrailerModel: Model<ITrailerDoc> =
  models.Trailer || model<ITrailerDoc>('Trailer', trailerSchema)

export default TrailerModel
