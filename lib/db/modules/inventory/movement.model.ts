import { Schema, model, models, Document, Model, Types } from 'mongoose'

export interface IStockMovementDoc extends Document {
  product: Types.ObjectId
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
    product: { type: Schema.Types.ObjectId, ref: 'ERPProduct', required: true },
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
