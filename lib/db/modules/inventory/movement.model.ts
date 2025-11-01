import { Schema, model, models, Document, Model, Types } from 'mongoose'
import { ICostBreakdownBatch } from './types'

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
  responsibleUserName?: string
  note?: string
  timestamp: Date
  balanceBefore: number
  status: 'ACTIVE' | 'CANCELLED'
  balanceAfter: number
  unitCost?: number // Costul unitar (pt INTRARI) sau Costul Mediu FIFO (pt IESIRI)
  lineCost?: number // Costul total al mișcării
  costBreakdown?: ICostBreakdownBatch[] // Detalierea loturilor (doar pt IESIRI)
  createdAt: Date
  updatedAt: Date
}

const CostBreakdownBatchSchema = new Schema<ICostBreakdownBatch>(
  {
    movementId: {
      type: Schema.Types.ObjectId,
      ref: 'StockMovement',
      required: true,
    },
    entryDate: { type: Date, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
  },
  { _id: false }
)

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
    responsibleUserName: { type: String, required: false },
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
    unitCost: { type: Number, required: false },
    lineCost: { type: Number, required: false },
    costBreakdown: { type: [CostBreakdownBatchSchema], required: false },
  },
  { timestamps: true }
)

const StockMovementModel: Model<IStockMovementDoc> =
  (models.StockMovement as Model<IStockMovementDoc>) ||
  model<IStockMovementDoc>('StockMovement', StockMovementSchema)

export default StockMovementModel
