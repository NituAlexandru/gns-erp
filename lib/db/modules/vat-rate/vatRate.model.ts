import { Document, Model, model, models, Schema } from 'mongoose'

export interface IVatRate extends Document {
  vatRate: number
  createdAt: Date
  updatedAt: Date
}

const vatRateSchema = new Schema<IVatRate>(
  {
    vatRate: { type: Number, required: true }, // ex: 0.19 pentru 19%
  },
  {
    timestamps: true, // pentru createdAt / updatedAt
  }
)

const VatRate: Model<IVatRate> =
  models.VatRate || model<IVatRate>('VatRate', vatRateSchema)

export default VatRate
