import { Schema, model, models, Document, Model, Types } from 'mongoose'

export interface IStockMovementDoc extends Document {
  stockableItem: Types.ObjectId
  stockableItemType: 'Product' | 'Packaging'
  movementType: string
  quantity: number
  locationFrom?: string
  locationTo?: string
  referenceId?: string
  note?: string
  timestamp: Date
  balanceBefore: number
  balanceAfter: number
  createdAt: Date
  updatedAt: Date
}

const StockMovementSchema = new Schema<IStockMovementDoc>(
  {
    stockableItemType: {
      type: String,
      required: true,
      enum: ['Product', 'Packaging'],
    },
    stockableItem: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'stockableItemType',
    },
    movementType: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    locationFrom: { type: String },
    locationTo: { type: String },
    referenceId: { type: String },
    note: { type: String },
    timestamp: { type: Date, default: () => new Date() },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
)

const StockMovementModel: Model<IStockMovementDoc> =
  (models.StockMovement as Model<IStockMovementDoc>) ||
  model<IStockMovementDoc>('StockMovement', StockMovementSchema)

export default StockMovementModel
