import { Document, Model, model, models, Schema, Types } from 'mongoose'
import { ISupplierInput } from '@/types'

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
    bankAccount: { type: String },
    externalTransport: { type: Boolean, default: false },
    transportCosts: { type: Number, default: 0 },
    loadingAddress: { type: String },
    productCatalog: [{ type: Types.ObjectId, ref: 'Product' }],
    supplierDriver: { type: String },
    // Transport extern: dacă este adevărat, se va folosi un sofer furnizat de furnizor
    externalTransportCosts: { type: Number, default: 0 },
    // Costuri de transport generale (poate fi folosit pentru costuri interne sau externe, după necesitate)
    internalTransportCosts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
)

// Index pe câmpul name pentru interogări rapide
supplierSchema.index({ name: 1 })

const Supplier: Model<ISupplier> =
  models.Supplier || model<ISupplier>('Supplier', supplierSchema)

export default Supplier
