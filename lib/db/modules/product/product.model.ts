import { Document, Model, model, models, Schema, Types } from 'mongoose'
import { UNITS } from '@/lib/constants'
import { IProductInput } from './types'

export interface IERPProductDoc extends Document, IProductInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

const erpProductSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: Types.ObjectId, ref: 'Category', required: false },
    mainCategory: { type: Types.ObjectId, ref: 'Category', required: false },
    barCode: { type: String, required: false },
    productCode: { type: String, required: true },
    images: [String],
    description: { type: String },
    mainSupplier: { type: Types.ObjectId, ref: 'Supplier', required: false },
    brand: { type: String },
    minStock: { type: Number, required: false, default: 0 },
    countInStock: { type: Number, required: false, default: 0 },
    firstOrderDate: { type: Date, required: false },
    lastOrderDate: { type: Date, required: false },
    numSales: { type: Number, required: false, default: 0 },
    // Preț mediu de achiziție - se calculeaza automat. medie ponderata
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
    clientMarkups: [
      {
        clientId: { type: Types.ObjectId, ref: 'Client', required: false },
        markups: {
          markupDirectDeliveryPrice: { type: Number, required: false },
          markupFullTruckPrice: { type: Number, required: false },
          markupSmallDeliveryBusinessPrice: { type: Number, required: false },
        },
      },
    ],
    unit: { type: String, enum: UNITS, required: true },
    packagingUnit: { type: String, enum: UNITS, required: false },
    packagingQuantity: { type: Number, required: false },
    length: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    volume: { type: Number, required: true },
    weight: { type: Number, required: true },
    specifications: { type: [String], required: true },
    palletTypeId: { type: String, required: false },
    itemsPerPallet: { type: Number, required: false, default: 1 },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
)

erpProductSchema.index({ barCode: 1 })
erpProductSchema.index({ mainSupplier: 1 })
erpProductSchema.index({ category: 1 })

const ERPProductModel: Model<IERPProductDoc> =
  (models.ERPProduct as Model<IERPProductDoc>) ||
  model<IERPProductDoc>('ERPProduct', erpProductSchema)

export default ERPProductModel
