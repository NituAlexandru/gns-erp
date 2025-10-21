import { Schema, model, models, Document, Model, Types } from 'mongoose'

export interface IInventoryBatch {
  quantity: number
  unitCost: number
  entryDate: Date
  movementId: Types.ObjectId
}

export interface IInventoryItemDoc extends Document {
  stockableItem: Types.ObjectId
  stockableItemType: 'ERPProduct' | 'Packaging'
  location: string
  clientId?: Types.ObjectId
  batches: IInventoryBatch[]
  quantityReserved: number
  totalStock: number
  averageCost: number
  maxPurchasePrice: number
  minPurchasePrice: number
  lastPurchasePrice: number
  createdAt: Date
  updatedAt: Date
}

const InventoryBatchSchema = new Schema<IInventoryBatch>(
  {
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    entryDate: { type: Date, required: true },
    movementId: {
      type: Schema.Types.ObjectId,
      ref: 'StockMovement',
      required: true,
    },
  },
  { _id: false }
)

const InventoryItemSchema = new Schema<IInventoryItemDoc>(
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
    location: { type: String, required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', sparse: true },
    batches: [InventoryBatchSchema],
    quantityReserved: { type: Number, required: true, default: 0 },
    totalStock: { type: Number, required: true, default: 0 },
    averageCost: { type: Number, required: true, default: 0 },
    maxPurchasePrice: { type: Number, required: true, default: 0 },
    minPurchasePrice: { type: Number, required: true, default: 0 },
    lastPurchasePrice: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

const InventoryItemModel: Model<IInventoryItemDoc> =
  (models.InventoryItem as Model<IInventoryItemDoc>) ||
  model<IInventoryItemDoc>('InventoryItem', InventoryItemSchema)

export default InventoryItemModel
