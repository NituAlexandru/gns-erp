import { Document, Model, model, models, Schema, Types } from 'mongoose'
import { UNITS } from '@/lib/constants'
import type { IPackagingInput } from './types'

export interface IPackagingDoc extends Document, IPackagingInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

const packagingSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    supplier: { type: Types.ObjectId, ref: 'Supplier', required: true },
    category: { type: Types.ObjectId, ref: 'Category', required: false },
    mainCategory: { type: Types.ObjectId, ref: 'Category', default: null },
    // countInStock: { type: Number, required: false, default: 0 },
    images: { type: [String], default: [] },
    entryPrice: { type: Number, default: 0 },
    listPrice: { type: Number, default: 0 },
    averagePurchasePrice: { type: Number, required: false, default: 0 },
    defaultMarkups: {
      markupDirectDeliveryPrice: { type: Number, required: false, default: 0 },
      markupFullTruckPrice: { type: Number, required: false, default: 0 },
      markupSmallDeliveryBusinessPrice: {
        type: Number,
        required: false,
        default: 0,
      },
      markupRetailPrice: { type: Number, required: false, default: 0 },
    },
    packagingQuantity: { type: Number, default: 1 },
    packagingUnit: { type: String, enum: UNITS },
    productCode: { type: String, required: true },
    isPublished: { type: Boolean, default: true },
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    volume: { type: Number, required: true },
    weight: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
)

const PackagingModel: Model<IPackagingDoc> =
  (models.Packaging as Model<IPackagingDoc>) ||
  model<IPackagingDoc>('Packaging', packagingSchema)

export default PackagingModel
