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
    currency: {
      type: String,
      default: 'RON',
      required: true,
    },
    exchangeRate: {
      type: Number,
      default: 1,
      required: true,
    },
    originalCurrencyAmount: {
      type: Number,
      required: false,
    },
    totalAmount: { type: Number, required: true },
    unallocatedAmount: { type: Number, required: true },
    isRefund: { type: Boolean, default: false },
    referenceDocument: {
      type: String,
      index: true,
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
  { timestamps: true },
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

  // --- Izolată strict pentru RESTITUIRI (Sume Negative) ---
  if (this.isRefund) {
    // Atenție: aici lucrăm cu numere negative! (ex: total -900)
    // Când s-a alocat tot, ajunge la 0 (sau peste din eroare de rotunjire microscopică)
    if (unallocated >= 0) {
      this.status = 'ALOCAT_COMPLET'
      this.unallocatedAmount = 0
    } else if (unallocated <= total) {
      this.status = 'NEALOCATA'
    } else {
      this.status = 'PARTIAL_ALOCAT'
    }
    return next()
  }

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

// 1. Index pentru filtrarea ultra-rapidă a plăților care mai au bani disponibili
ClientPaymentSchema.index({ status: 1, unallocatedAmount: 1 })

// 2. Index pentru căutări rapide pe un anumit client (pentru viitor)
ClientPaymentSchema.index({ clientId: 1, unallocatedAmount: 1 })

const ClientPaymentModel =
  (models.ClientPayment as Model<IClientPaymentDoc>) ||
  mongoose.model<IClientPaymentDoc>('ClientPayment', ClientPaymentSchema)

export default ClientPaymentModel
