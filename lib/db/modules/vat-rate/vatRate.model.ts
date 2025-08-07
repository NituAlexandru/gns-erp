import { Document, Model, models, model, Schema, Types } from 'mongoose'

// --- Interfața pentru Cota de TVA ---
export interface IVatRateDoc extends Document {
  _id: Types.ObjectId
  name: string
  rate: number
  isActive: boolean
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// --- Interfața pentru Istoricul Cotei Implicite ---
export interface IDefaultVatHistoryDoc extends Document {
  _id: Types.ObjectId
  vatRateId: Types.ObjectId
  rateValue: number
  setAsDefaultAt: Date
  setByUserId: Types.ObjectId
}

// --- Schema pentru Cota de TVA ---
const vatRateSchema = new Schema<IVatRateDoc>(
  {
    name: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

// --- Schema pentru Istoricul Cotei Implicite ---
const defaultVatHistorySchema = new Schema<IDefaultVatHistoryDoc>(
  {
    vatRateId: {
      type: Schema.Types.ObjectId,
      ref: 'VatRate',
      required: true,
    },
    rateValue: { type: Number, required: true },
    setAsDefaultAt: { type: Date, default: Date.now },
    setByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: false }
)

export const VatRateModel: Model<IVatRateDoc> =
  (models.VatRate as Model<IVatRateDoc>) ||
  model<IVatRateDoc>('VatRate', vatRateSchema)

export const DefaultVatHistoryModel: Model<IDefaultVatHistoryDoc> =
  (models.DefaultVatHistory as Model<IDefaultVatHistoryDoc>) ||
  model<IDefaultVatHistoryDoc>('DefaultVatHistory', defaultVatHistorySchema)
