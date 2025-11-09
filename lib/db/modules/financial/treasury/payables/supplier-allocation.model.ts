import mongoose, { Schema, models, Model } from 'mongoose'
import { ISupplierAllocationDoc } from './supplier-allocation.types'

// --- Schema Mongoose ---
const SupplierAllocationSchema = new Schema<ISupplierAllocationDoc>(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'SupplierPayment', // Referință la plata noastră
      required: true,
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'SupplierInvoice', // Referință la factura furnizor
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
  { timestamps: true }
)

SupplierAllocationSchema.index({ paymentId: 1, invoiceId: 1 }, { unique: true })

const SupplierAllocationModel =
  (models.SupplierAllocation as Model<ISupplierAllocationDoc>) ||
  mongoose.model<ISupplierAllocationDoc>(
    'SupplierAllocation',
    SupplierAllocationSchema
  )

export default SupplierAllocationModel
