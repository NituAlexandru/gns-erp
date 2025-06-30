import mongoose, { Schema, model, models } from 'mongoose'

import { DELIVERY_STATUSES } from './constants'
import { IDeliveryDoc } from './types'

const deliverySchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    carNumber: { type: String },
    deliveryDate: { type: Date, default: Date.now },
    client: { type: String, required: true },
    status: {
      type: String,
      enum: DELIVERY_STATUSES,
      default: 'In curs',
    },
    notes: { type: String },
  },
  { timestamps: true }
)

// Indexuri
deliverySchema.index({ driver: 1 })
deliverySchema.index({ vehicle: 1 })
deliverySchema.index({ deliveryDate: 1 })

const DeliveryModel: mongoose.Model<IDeliveryDoc> =
  (models.Delivery as mongoose.Model<IDeliveryDoc>) ||
  model<IDeliveryDoc>('Delivery', deliverySchema)

export default DeliveryModel
