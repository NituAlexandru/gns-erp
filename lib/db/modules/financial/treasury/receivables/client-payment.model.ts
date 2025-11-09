import mongoose, { Schema, models, Model } from 'mongoose'
import { PAYMENT_METHODS } from '../payment.constants'
import { IClientPaymentDoc } from './client-payment.types' // <-- Importă din types

// --- Schema Mongoose ---
const ClientPaymentSchema = new Schema<IClientPaymentDoc>(
  {
    paymentNumber: { type: String, required: true, unique: true, index: true },
    seriesName: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: { type: String, required: true, enum: PAYMENT_METHODS },
    totalAmount: { type: Number, required: true, min: 0.01 },
    unallocatedAmount: { type: Number, required: true },
    referenceDocument: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['NEALOCAT', 'PARTIAL_ALOCAT', 'ALOCAT_COMPLET'],
      default: 'NEALOCAT',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

// --- Hook-ul .pre('save') ---
ClientPaymentSchema.pre('save', function (next) {
  if (this.isNew) {
    this.unallocatedAmount = this.totalAmount
    this.status = 'NEALOCAT'
  }
  if (this.unallocatedAmount < 0) {
    this.unallocatedAmount = 0
  }
  if (this.isNew || this.isModified('unallocatedAmount')) {
    if (this.unallocatedAmount === 0) {
      this.status = 'ALOCAT_COMPLET'
    } else if (this.unallocatedAmount < this.totalAmount) {
      this.status = 'PARTIAL_ALOCAT'
    } else {
      this.status = 'NEALOCAT'
    }
  }
  next()
})

ClientPaymentSchema.index(
  { seriesName: 1, sequenceNumber: 1 },
  { unique: true }
)

const ClientPaymentModel =
  (models.ClientPayment as Model<IClientPaymentDoc>) ||
  mongoose.model<IClientPaymentDoc>('ClientPayment', ClientPaymentSchema)

export default ClientPaymentModel
