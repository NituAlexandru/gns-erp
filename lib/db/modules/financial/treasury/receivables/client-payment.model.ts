import mongoose, { Schema, models, Model } from 'mongoose'
import { PAYMENT_METHODS } from '../payment.constants'
import { IClientPaymentDoc } from './client-payment.types'
import { CLIENT_PAYMENT_STATUSES } from './client-payment.constants'
import { round2 } from '@/lib/utils' 

// --- Schema Mongoose ---
const ClientPaymentSchema = new Schema<IClientPaymentDoc>(
  {
    paymentNumber: { type: String, required: true, index: true },
    seriesName: { type: String, required: false },
    sequenceNumber: { type: Number, required: false, default: null },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: { type: String, required: true, enum: PAYMENT_METHODS },
    totalAmount: { type: Number, required: true },
    unallocatedAmount: { type: Number, required: true },
    referenceDocument: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    notes: { type: String },
    status: {
      type: String,
      enum: CLIENT_PAYMENT_STATUSES,
      default: 'NEALOCATA',
      required: true,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

// --- Hook-ul .pre('save') ---
ClientPaymentSchema.pre('save', function (this: IClientPaymentDoc, next) {
  // Protecție pentru statusul ANULATA
  if (this.status === 'ANULATA') {
    return next()
  }

  // Setări la creare
  if (this.isNew) {
    this.unallocatedAmount = this.totalAmount
    this.status = 'NEALOCATA'
  }

  // Rotunjim valorile înainte de a le compara
  const unallocated = round2(this.unallocatedAmount)
  const total = round2(this.totalAmount)

  // Asigurăm că valoarea negativă este 0
  if (unallocated < 0) {
    this.unallocatedAmount = 0
  }
  // Rulăm logica de status doar dacă e nou sau s-a modificat suma
  if (this.isNew || this.isModified('unallocatedAmount')) {
    // Folosim valorile rotunjite pentru comparație
    if (unallocated <= 0) {
      this.status = 'ALOCAT_COMPLET'
      this.unallocatedAmount = 0
    } else if (unallocated < total) {
      // ex: 99.99 < 100
      this.status = 'PARTIAL_ALOCAT'
    } else {
      // ex: 100 >= 100
      this.status = 'NEALOCATA'
      // Asigurăm că suma nealocată nu depășește totalul (în caz de erori)
    }
  }
  next()
})

const ClientPaymentModel =
  (models.ClientPayment as Model<IClientPaymentDoc>) ||
  mongoose.model<IClientPaymentDoc>('ClientPayment', ClientPaymentSchema)

export default ClientPaymentModel
