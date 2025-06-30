import { Schema, model, models, Types, Model } from 'mongoose'
import { IReturnToSupplierDoc } from './types'


const returnToSupplierSchema = new Schema(
  {
    returnType: {
      type: String,
      enum: ['supplier'],
      default: 'supplier',
      required: true,
    },
    supplier: { type: Types.ObjectId, ref: 'Supplier', required: true },
    products: [
      {
        product: { type: Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        reason: { type: String, required: true },
        priceAtReturn: { type: Number, default: null },
      },
    ],
    returnDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Draft', 'Final'], default: 'Draft' },
    originalOrder: { type: Types.ObjectId, ref: 'Order' },
    originalInvoice: { type: Types.ObjectId, ref: 'Invoice' },
  },
  { timestamps: true }
)

returnToSupplierSchema.index({ supplier: 1 })
returnToSupplierSchema.index({ returnDate: 1 })
returnToSupplierSchema.index({ status: 1 })

const ReturnSupplierModel: Model<IReturnToSupplierDoc> = models.ReturnSupplier
  ? (models.ReturnSupplier as Model<IReturnToSupplierDoc>)
  : model<IReturnToSupplierDoc>('ReturnSupplier', returnToSupplierSchema)

export default ReturnSupplierModel
