import { Schema, model, models, Document, Model } from 'mongoose'
import type { IPriceEvent } from './types'

export interface IPriceEventDoc extends Document, IPriceEvent {
  _id: string
  createdAt: Date
  updatedAt: Date
}

const PriceEventSchema = new Schema<IPriceEventDoc>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'ERPProduct',
      required: true,
      index: true,
    },
    productName: { type: String, required: true },
    eventType: { type: String, required: true, enum: ['PURCHASE', 'SALE'] },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    total: { type: Number, required: true },
    referenceId: { type: String },
    timestamp: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true }
)

const PriceEventModel: Model<IPriceEventDoc> =
  (models.PriceEvent as Model<IPriceEventDoc>) ||
  model<IPriceEventDoc>('PriceEvent', PriceEventSchema)

export default PriceEventModel
