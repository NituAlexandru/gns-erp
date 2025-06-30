import { Schema, model, models, Types, Model } from 'mongoose'
import type { IReturnClientDoc } from './types'

const returnFromClientSchema = new Schema(
  {
    returnType: {
      type: String,
      enum: ['client'],
      default: 'client',
      required: true,
    },
    client: { type: Types.ObjectId, ref: 'Client', required: true },
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

returnFromClientSchema.index({ client: 1 })
returnFromClientSchema.index({ returnDate: 1 })
returnFromClientSchema.index({ status: 1 })

const ReturnFromClientModel: Model<IReturnClientDoc> = models.ReturnClient
  ? (models.ReturnClient as Model<IReturnClientDoc>)
  : model<IReturnClientDoc>('ReturnClient', returnFromClientSchema)

export default ReturnFromClientModel
