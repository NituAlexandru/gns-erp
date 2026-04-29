import mongoose, { Schema, models, Model, Document, Types } from 'mongoose'

export interface ISupplierRefundAllocationDoc extends Document {
  _id: Types.ObjectId
  advancePaymentId: Types.ObjectId // ID-ul OP-ului inițial (Avansul)
  refundPaymentId: Types.ObjectId // ID-ul OP-ului cu minus (Restituirea)
  amountAllocated: number // Suma cu care se sting reciproc (ex: 900)
  allocationDate: Date
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

const SupplierRefundAllocationSchema = new Schema<ISupplierRefundAllocationDoc>(
  {
    advancePaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'SupplierPayment',
      required: true,
      index: true,
    },
    refundPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'SupplierPayment',
      required: true,
      index: true,
    },
    amountAllocated: {
      type: Number,
      required: true,
      min: 0.01,
    },
    allocationDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true },
)

// Index unic pentru a nu aloca de două ori exact aceleași documente
SupplierRefundAllocationSchema.index(
  { advancePaymentId: 1, refundPaymentId: 1 },
  { unique: true },
)

const SupplierRefundAllocationModel =
  (models.SupplierRefundAllocation as Model<ISupplierRefundAllocationDoc>) ||
  mongoose.model<ISupplierRefundAllocationDoc>(
    'SupplierRefundAllocation',
    SupplierRefundAllocationSchema,
  )

export default SupplierRefundAllocationModel
