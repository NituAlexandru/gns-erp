import mongoose, { Schema, models, Model } from 'mongoose'
import { IPaymentAllocationDoc } from './payment-allocation.types'

const PaymentAllocationSchema = new Schema<IPaymentAllocationDoc>(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'ClientPayment',
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    amountAllocated: {
      type: Number,
      required: true,
    },
    allocationDate: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

const PaymentAllocationModel =
  (models.PaymentAllocation as Model<IPaymentAllocationDoc>) ||
  mongoose.model<IPaymentAllocationDoc>(
    'PaymentAllocation',
    PaymentAllocationSchema
  )

export default PaymentAllocationModel
