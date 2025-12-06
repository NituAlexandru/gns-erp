import { Schema, model, models } from 'mongoose'
import type { IClientDoc } from './types'

// Schemă reutilizabilă pentru adresă
const addressSchema = new Schema(
  {
    judet: { type: String, required: true },
    localitate: { type: String, required: true },
    strada: { type: String, required: true },
    numar: { type: String, required: true },
    codPostal: { type: String, required: true },
    tara: { type: String, required: true, default: 'RO' },
    alteDetalii: { type: String },
    persoanaContact: { type: String, required: true },
    telefonContact: { type: String, required: true },
    distanceInKm: { type: Number },
    travelTimeInMinutes: { type: Number },
    isActive: { type: Boolean, default: true, required: true },
  },
  { _id: true }
)

//  Schemă reutilizabilă pentru contul bancar
const bankAccountSchema = new Schema(
  {
    iban: { type: String },
    bankName: { type: String },
  },
  { _id: false }
)

const clientSchema = new Schema<IClientDoc>(
  {
    clientType: {
      type: String,
      required: true,
      enum: ['Persoana fizica', 'Persoana juridica'],
    },
    name: { type: String, required: true },
    cnp: {
      type: String,
      required: function () {
        return this.clientType === 'Persoana fizica'
      },
      unique: true,
      sparse: true,
    },
    vatId: {
      type: String,
      required: function () {
        return this.clientType === 'Persoana juridica'
      },
      unique: true,
      sparse: true,
    },
    nrRegComert: {
      type: String,
      required: function () {
        return this.clientType === 'Persoana juridica'
      },
    },
    isVatPayer: { type: Boolean, default: false },
    email: { type: String },
    phone: { type: String },
    contractNumber: { type: String },
    contractDate: { type: Date },

    address: {
      type: addressSchema,
      required: true,
    },

    deliveryAddresses: {
      type: [addressSchema],
      default: [],
    },

    bankAccountLei: { type: bankAccountSchema },
    bankAccountEuro: { type: bankAccountSchema },
    mentions: { type: String },
    paymentTerm: { type: Number, default: 0 },
    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    updatedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
    },
    defaultMarkups: {
      directDeliveryPrice: { type: Number, default: 0 },
      fullTruckPrice: { type: Number, default: 0 },
      smallDeliveryBusinessPrice: { type: Number, default: 0 },
      retailPrice: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

// Indici pentru căutări rapide
clientSchema.index({ phone: 1 }, { sparse: true })
clientSchema.index({ email: 1 }, { sparse: true })

const ClientModel = models.Client || model<IClientDoc>('Client', clientSchema)

export default ClientModel
