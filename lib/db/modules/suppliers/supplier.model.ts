import { Document, Model, model, models, Schema } from 'mongoose'
import { ISupplierInput } from './types'

export interface ISupplier extends Document, ISupplierInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    fiscalCode: { type: String },
    regComNumber: { type: String },
    bankAccountLei: { type: String },
    bankAccountEuro: { type: String },
    externalTransport: { type: Boolean, default: false },
    loadingAddress: { type: [String], default: [] },
    externalTransportCosts: { type: Number, default: 0 },
    internalTransportCosts: { type: Number, default: 0 },
    brand: { type: [String], default: [] },
    mentions: { type: String },
    isVatPayer: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

supplierSchema.index({ name: 1 })

const Supplier: Model<ISupplier> =
  models.Supplier || model<ISupplier>('Supplier', supplierSchema)

export default Supplier
