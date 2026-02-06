import mongoose, { Schema, Document, models } from 'mongoose'

export interface IClientReceiptCounterDoc extends Document {
  clientId: mongoose.Types.ObjectId
  year: number
  currentNumber: number
}

const ClientReceiptCounterSchema: Schema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    currentNumber: {
      type: Number,
      required: true,
      default: 0, // Începe de la 0, deci primul increment va fi 1
    },
  },
  { timestamps: true },
)

// Index Compus Unic: Un client nu poate avea două contoare pentru același an.
ClientReceiptCounterSchema.index({ clientId: 1, year: 1 }, { unique: true })

const ClientReceiptCounter =
  models.ClientReceiptCounter ||
  mongoose.model<IClientReceiptCounterDoc>(
    'ClientReceiptCounter',
    ClientReceiptCounterSchema,
  )

export default ClientReceiptCounter
