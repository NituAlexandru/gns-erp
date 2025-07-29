import { Schema, model, models, Document, Model, Types } from 'mongoose'

export interface IInventoryBatch {
  quantity: number
  unitCost: number
  entryDate: Date
}

export interface IInventoryItemDoc extends Document {
  stockableItem: Types.ObjectId // ID-ul documentului (poate fi Product sau Packaging)
  stockableItemType: 'Product' | 'Packaging' // Numele modelului de referință
  location: string
  batches: IInventoryBatch[]
  quantityReserved: number
  createdAt: Date
  updatedAt: Date
}

const InventoryBatchSchema = new Schema<IInventoryBatch>(
  {
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    entryDate: { type: Date, required: true },
  },
  { _id: false }
)

const InventoryItemSchema = new Schema<IInventoryItemDoc>(
  {
    stockableItemType: {
      type: String,
      required: true,
      enum: ['Product', 'Packaging'], // Modelele pe care le permitem
    },
    stockableItem: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'stockableItemType', // Aici este magia Mongoose
    },
    location: { type: String, required: true, index: true },
    batches: [InventoryBatchSchema],
    quantityReserved: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

const InventoryItemModel: Model<IInventoryItemDoc> =
  (models.InventoryItem as Model<IInventoryItemDoc>) ||
  model<IInventoryItemDoc>('InventoryItem', InventoryItemSchema)

export default InventoryItemModel
