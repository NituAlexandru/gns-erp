import { Document, Model, model, models, Schema, Types } from 'mongoose'
import { UNITS } from '@/lib/constants'
import { IProductInput } from './types'

export interface IProductSupplierInfo {
  supplier: Types.ObjectId
  supplierProductCode?: string
  lastPurchasePrice?: number
  isMain?: boolean
  updatedAt: Date
}

export interface IERPProductDoc
  extends Document,
    Omit<IProductInput, 'suppliers'> {
  _id: string
  suppliers: IProductSupplierInfo[]
  createdAt: Date
  updatedAt: Date
}

const ProductSupplierInfoSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierProductCode: { type: String },
    lastPurchasePrice: { type: Number },
    isMain: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

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
    suppliers: { type: [ProductSupplierInfoSchema], default: [] },
    brand: { type: String },
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
    itemsPerPallet: { type: Number, required: false, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
)

erpProductSchema.index({ barCode: 1 })
erpProductSchema.index({ category: 1 })

const ERPProductModel: Model<IERPProductDoc> =
  (models.ERPProduct as Model<IERPProductDoc>) ||
  model<IERPProductDoc>('ERPProduct', erpProductSchema)

export default ERPProductModel
