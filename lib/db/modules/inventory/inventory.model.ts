import { Schema, model, models, Document, Model, Types } from 'mongoose'

export interface IInventoryItemDoc extends Document {
  product: Types.ObjectId
  location: string
  quantityOnHand: number
  quantityReserved: number
  averageCost: number
  createdAt: Date
  updatedAt: Date
}

const InventoryItemSchema = new Schema<IInventoryItemDoc>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'ERPProduct', required: true },
    location: { type: String, required: true, index: true },
    quantityOnHand: { type: Number, required: true, default: 0 },
    quantityReserved: { type: Number, required: true, default: 0 },
    averageCost: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

const InventoryItemModel: Model<IInventoryItemDoc> =
  (models.InventoryItem as Model<IInventoryItemDoc>) ||
  model<IInventoryItemDoc>('InventoryItem', InventoryItemSchema)

export default InventoryItemModel
