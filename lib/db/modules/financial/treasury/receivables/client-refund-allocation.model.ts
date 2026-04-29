import mongoose, { Schema, models, Model, Document, Types } from 'mongoose'

export interface IClientRefundAllocation extends Document {
  advancePaymentId: Types.ObjectId
  refundPaymentId: Types.ObjectId
  amountAllocated: number
  allocationDate: Date
  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

const ClientRefundAllocationSchema = new Schema<IClientRefundAllocation>(
  {
    advancePaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'ClientPayment',
      required: true,
      index: true,
    },
    refundPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'ClientPayment',
      required: true,
      index: true,
    },
    amountAllocated: { type: Number, required: true },
    allocationDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true },
)

const ClientRefundAllocationModel =
  (models.ClientRefundAllocation as Model<IClientRefundAllocation>) ||
  mongoose.model<IClientRefundAllocation>(
    'ClientRefundAllocation',
    ClientRefundAllocationSchema,
  )

export default ClientRefundAllocationModel
