import { Schema, model, models, Document, Model, Types } from 'mongoose'

export interface IStockMovementDoc extends Document {
  stockableItem: Types.ObjectId
  stockableItemType: 'ERPProduct' | 'Packaging'
  movementType: string
  quantity: number
  unitMeasure?: string
  locationFrom?: string
  locationTo?: string
  referenceId?: Types.ObjectId
  responsibleUser?: Types.ObjectId
  note?: string
  timestamp: Date
  balanceBefore: number
  status: 'ACTIVE' | 'CANCELLED'
  balanceAfter: number
  createdAt: Date
  updatedAt: Date
}

const StockMovementSchema = new Schema<IStockMovementDoc>(
  {
    stockableItemType: {
      type: String,
      required: true,
      enum: ['ERPProduct', 'Packaging'],
    },
    stockableItem: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'stockableItemType',
    },
    movementType: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    unitMeasure: { type: String },
    locationFrom: { type: String },
    locationTo: { type: String },
    referenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Reception',
      required: true,
    },
    responsibleUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    note: { type: String },
    timestamp: { type: Date, default: () => new Date() },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED'],
      default: 'ACTIVE',
      required: true,
      index: true,
    },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
)

const StockMovementModel: Model<IStockMovementDoc> =
  (models.StockMovement as Model<IStockMovementDoc>) ||
  model<IStockMovementDoc>('StockMovement', StockMovementSchema)

export default StockMovementModel
