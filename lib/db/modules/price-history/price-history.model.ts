import { Schema, model, models, Document, Types, Model } from 'mongoose'
import { STOCK_MOVEMENT_TYPES } from '../inventory/constants'

const PriceTransactionSchema = new Schema(
  {
    date: { type: Date, required: true },
    partner: {
      _id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
    },
    referenceId: { type: Schema.Types.ObjectId, required: true },

    // 👇 VALIDARE STRICTĂ PE TIPURILE DIN INVENTORY
    transactionType: {
      type: String,
      required: true,
      enum: STOCK_MOVEMENT_TYPES,
    },

    unitMeasure: { type: String, required: true },
    createdBy: {
      _id: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
    },

    netPrice: { type: Number, required: true },
    vatRate: { type: Number, required: true },
    vatValue: { type: Number, required: true },
    grossPrice: { type: Number, required: true },
  },
  { _id: false },
)

export interface IPriceHistoryDoc extends Document {
  stockableItem: Types.ObjectId
  stockableItemType: 'ERPProduct' | 'Packaging'
  productName: string
  productCode: string
  baseUnit: string
  suppliers: Array<{
    _id: Types.ObjectId
    name: string
  }>
  purchases: any[]
  sales: any[]
  createdAt: Date
  updatedAt: Date
}

const PriceHistorySchema = new Schema<IPriceHistoryDoc>(
  {
    stockableItem: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'stockableItemType',
    },
    stockableItemType: {
      type: String,
      required: true,
      enum: ['ERPProduct', 'Packaging'],
    },
    productName: { type: String, required: true },
    productCode: { type: String, required: true },
    baseUnit: { type: String, required: true },
    suppliers: [
      {
        _id: { type: Schema.Types.ObjectId },
        name: { type: String },
      },
    ],
    purchases: [PriceTransactionSchema],
    sales: [PriceTransactionSchema],
  },
  { timestamps: true },
)

PriceHistorySchema.index({ stockableItem: 1 }, { unique: true })

const PriceHistoryModel: Model<IPriceHistoryDoc> =
  models.PriceHistory || model('PriceHistory', PriceHistorySchema)

export default PriceHistoryModel
