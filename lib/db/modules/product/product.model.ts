import { Document, Model, model, models, Schema, Types } from 'mongoose'
import { UNITS } from '@/lib/constants'
import { IERPProductInput } from './types'

export interface IERPProductDoc extends Document, IERPProductInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

// Schema pentru documentul "ERPProduct" – aici stocăm tot ce ţine de ERP: stocuri,
// prețuri multiple, markup-uri, istoricul comenzilor ş.a.
const erpProductSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    category: { type: Types.ObjectId, ref: 'Category', required: false },
    barCode: { type: String },
    productCode: { type: String, required: true },
    images: [String],
    description: { type: String },
    mainSupplier: { type: Types.ObjectId, ref: 'Supplier', required: false },
    directDeliveryPrice: { type: Number, required: true },
    fullTruckPrice: { type: Number, required: true },
    smallDeliveryBusinessPrice: { type: Number, required: true },
    retailPrice: { type: Number, required: true },
    minStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    firstOrderDate: { type: Date },
    lastOrderDate: { type: Date },
    numSales: { type: Number, required: true, default: 0 },
    // Preț mediu de achiziție - se calculeaza automat. medie ponderata
    averagePurchasePrice: { type: Number, default: 0 },
    defaultMarkups: {
      markupDirectDeliveryPrice: { type: Number, default: 0 },
      markupFullTruckPrice: { type: Number, default: 0 },
      markupSmallDeliveryBusinessPrice: { type: Number, default: 0 },
      markupRetailPrice: { type: Number, default: 0 },
    },
    clientMarkups: [
      {
        clientId: { type: Types.ObjectId, ref: 'Client', required: true },
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
    isActive: { type: Boolean, default: true },
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
