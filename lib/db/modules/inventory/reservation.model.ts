import mongoose, { Schema, Document, models, Types, Model } from 'mongoose'

export interface IStockReservation extends Document {
  orderId: Types.ObjectId
  orderLineItemId: Types.ObjectId
  stockableItem: Types.ObjectId
  stockableItemType: 'ERPProduct' | 'Packaging'
  location: string
  quantity: number
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED'
  createdAt: Date
  updatedAt: Date
}

const StockReservationSchema = new Schema<IStockReservation>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderLineItemId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    stockableItem: {
      type: Schema.Types.ObjectId,
      refPath: 'stockableItemType',
      required: true,
    },
    stockableItemType: {
      type: String,
      enum: ['ERPProduct', 'Packaging'],
      required: true,
    },
    location: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'FULFILLED', 'CANCELLED'],
      default: 'ACTIVE',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
)

const StockReservationModel: Model<IStockReservation> =
  (models.StockReservation as Model<IStockReservation>) ||
  mongoose.model<IStockReservation>('StockReservation', StockReservationSchema)

export default StockReservationModel
