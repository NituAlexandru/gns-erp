import mongoose, { Schema, Document, models, Model, Types } from 'mongoose'
import { RECEIPT_STATUSES, ReceiptStatusKey } from './receipt.constants'

export interface IReceiptDoc extends Document {
  series: string
  number: string
  date: Date

  companySnapshot: {
    name: string
    cui: string
    regCom?: string
    address: {
      judet: string
      localitate: string
      strada: string
      numar: string
      codPostal: string
      alteDetalii: string
      tara: string
    }
  }
  clientSnapshot: {
    name: string
    cui?: string
    address: {
      judet: string
      localitate: string
      strada: string
      numar: string
      codPostal: string
      alteDetalii: string
      tara: string
    }
  }

  representative: string
  explanation: string

  amount: number
  amountInWords: string
  currency: string

  invoices: Types.ObjectId[]

  cashier: {
    userId: Types.ObjectId
    name: string
  }

  status: ReceiptStatusKey
  cancellationReason?: string
  cancelledBy?: Types.ObjectId
  cancelledByName?: string
  createdAt: Date
  updatedAt: Date
}

const ReceiptSchema = new Schema<IReceiptDoc>(
  {
    series: { type: String, required: true },
    number: { type: String, required: true },
    date: { type: Date, default: Date.now },

    companySnapshot: {
      name: { type: String, required: true },
      cui: { type: String, required: true },
      regCom: String,
      address: {
        judet: String,
        localitate: String,
        strada: String,
        numar: String,
        codPostal: String,
        alteDetalii: String,
        tara: String,
      },
    },
    clientSnapshot: {
      name: { type: String, required: true },
      cui: String,
      address: {
        judet: String,
        localitate: String,
        strada: String,
        numar: String,
        codPostal: String,
        alteDetalii: String,
        tara: String,
      },
    },
    representative: { type: String, required: true },
    explanation: { type: String, required: true },
    amount: { type: Number, required: true },
    amountInWords: { type: String, required: true },
    currency: { type: String, default: 'RON' },
    invoices: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    cashier: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    status: {
      type: String,
      enum: RECEIPT_STATUSES,
      default: 'VALID',
    },
    cancellationReason: String,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledByName: { type: String },
  },
  { timestamps: true }
)

// Index unic pe serie + număr
ReceiptSchema.index({ series: 1, number: 1 }, { unique: true })

const ReceiptModel =
  (models.Receipt as Model<IReceiptDoc>) ||
  mongoose.model<IReceiptDoc>('Receipt', ReceiptSchema)

export default ReceiptModel
