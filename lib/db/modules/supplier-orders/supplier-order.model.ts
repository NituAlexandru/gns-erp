import { Schema, model, models, Document, Model, Types } from 'mongoose'

export interface ISupplierOrderDoc extends Document {
  series: string
  number: string
  supplier: Types.ObjectId
  date: Date
  expectedDate?: Date
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED'
  items: {
    product: Types.ObjectId
    productType: 'ERPProduct' | 'Packaging'
    quantityOrdered: number
    quantityReceived: number
    pricePerUnit: number
  }[]
  createdAt: Date
  updatedAt: Date
}

const SupplierOrderSchema = new Schema<ISupplierOrderDoc>(
  {
    series: { type: String, default: 'CMD' },
    number: { type: String, required: true },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    date: { type: Date, default: Date.now },
    expectedDate: Date,
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    items: [
      {
        product: { type: Schema.Types.ObjectId, required: true },
        productType: {
          type: String,
          enum: ['ERPProduct', 'Packaging'],
          default: 'ERPProduct',
        },
        quantityOrdered: { type: Number, required: true },
        quantityReceived: { type: Number, default: 0 },
        pricePerUnit: { type: Number },
      },
    ],
  },
  { timestamps: true }
)

const SupplierOrderModel: Model<ISupplierOrderDoc> =
  (models.SupplierOrder as Model<ISupplierOrderDoc>) ||
  model<ISupplierOrderDoc>('SupplierOrder', SupplierOrderSchema)

export default SupplierOrderModel
