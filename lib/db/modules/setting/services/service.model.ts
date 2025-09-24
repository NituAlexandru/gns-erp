import { Document, Model, model, models, Schema, Types } from 'mongoose'

export interface IServiceDoc extends Document {
  _id: Types.ObjectId
  name: string
  code: string
  description?: string
  price: number
  unitOfMeasure: string
  vatRate: Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const serviceSchema = new Schema<IServiceDoc>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    price: { type: Number, required: true, default: 0 },
    unitOfMeasure: { type: String, required: true, default: 'buc' },
    vatRate: { type: Schema.Types.ObjectId, ref: 'VatRate', required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
)

const Service: Model<IServiceDoc> =
  models.Service || model<IServiceDoc>('Service', serviceSchema)

export default Service
