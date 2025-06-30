import mongoose, { Schema, model, models } from 'mongoose'
import type { IMarkupHistoryDoc } from './types'

const markupHistorySchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    defaultMarkups: {
      directDeliveryPrice: { type: Number, required: true },
      fullTruckPrice: { type: Number, required: true },
      smallDeliveryBusinessPrice: { type: Number, required: true },
      retailPrice: { type: Number, required: true },
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

markupHistorySchema.index({ product: 1 })
markupHistorySchema.index({ effectiveDate: 1 })

const MarkupHistoryModel: mongoose.Model<IMarkupHistoryDoc> =
  (models.MarkupHistory as mongoose.Model<IMarkupHistoryDoc>) ||
  model<IMarkupHistoryDoc>('MarkupHistory', markupHistorySchema)

export default MarkupHistoryModel
