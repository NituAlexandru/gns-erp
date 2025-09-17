import { Model, model, models, Schema } from 'mongoose'
import { ISupplierDoc } from './types'

//  Definirea sub-schemelor pentru datele structurate
const addressSchema = new Schema(
  {
    judet: { type: String, required: true },
    localitate: { type: String, required: true },
    strada: { type: String, required: true },
    numar: { type: String, required: true },
    codPostal: { type: String, required: true },
    alteDetalii: { type: String },
    distanceInKm: { type: Number },
    travelTimeInMinutes: { type: Number },
  },
  { _id: false }
)

const bankAccountSchema = new Schema(
  {
    iban: { type: String, required: true },
    bankName: { type: String, required: true },
  },
  { _id: false }
)

const supplierSchema = new Schema<ISupplierDoc>(
  {
    name: { type: String, required: true },
    contactName: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    fiscalCode: { type: String, required: true, unique: true, sparse: true },
    regComNumber: { type: String, required: true },
    isVatPayer: { type: Boolean, default: false },
    address: { type: addressSchema, required: true },
    loadingAddresses: { type: [addressSchema], default: [] },
    bankAccountLei: { type: bankAccountSchema },
    bankAccountEuro: { type: bankAccountSchema },
    paymentTerm: { type: Number, default: 0 },
    contractNumber: { type: String },
    contractDate: { type: Date },

    brand: { type: [String], default: [] },
    mentions: { type: String },
    externalTransport: { type: Boolean, default: false },
    externalTransportCosts: { type: Number, default: 0 },
    internalTransportCosts: { type: Number, default: 0 },

    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    updatedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
    },
  },
  {
    timestamps: true,
  }
)

const Supplier: Model<ISupplierDoc> =
  models.Supplier || model<ISupplierDoc>('Supplier', supplierSchema)

export default Supplier
