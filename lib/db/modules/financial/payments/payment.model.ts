import { Schema, model, models, Document, Model, Types } from 'mongoose'
import {
  PAYMENT_DIRECTIONS,
  PAYMENT_DOCUMENT_TYPES,
  PaymentDirection,
  PaymentDocumentType,
} from './constants'

export interface IPaymentDoc extends Document {
  _id: Types.ObjectId
  clientId?: Types.ObjectId
  supplierId?: Types.ObjectId
  partnerType: 'Client' | 'Supplier' | 'Other'
  paymentDate: Date
  amount: number
  currency: string
  direction: PaymentDirection

  documentType: PaymentDocumentType
  seriesName?: string // Seria introdusă manual (dacă există)
  documentNumber: string // Numărul introdus manual (ex: "OP 12345")
  bankTransactionId?: string // Pt import BT (ID unic)

  notes?: string
  appliedToInvoices: {
    invoiceId: Types.ObjectId
    amountApplied: number
  }[]

  createdBy: Types.ObjectId
  createdByName: string
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPaymentDoc>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    partnerType: {
      type: String,
      enum: ['Client', 'Supplier', 'Other'],
      required: true,
    },

    paymentDate: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'RON' },
    direction: {
      type: String,
      enum: PAYMENT_DIRECTIONS,
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: PAYMENT_DOCUMENT_TYPES,
      required: true,
    },
    seriesName: { type: String, required: false },
    documentNumber: { type: String, required: true, index: true },
    bankTransactionId: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
    notes: { type: String },
    appliedToInvoices: [
      {
        _id: false,
        invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
        amountApplied: { type: Number },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

const PaymentModel: Model<IPaymentDoc> =
  (models.Payment as Model<IPaymentDoc>) ||
  model<IPaymentDoc>('Payment', PaymentSchema)

export default PaymentModel
