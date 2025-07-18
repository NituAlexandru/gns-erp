import { Schema, model, models } from 'mongoose'
import type { IClientDoc } from './types'

const clientSchema = new Schema<IClientDoc>(
  {
    clientType: {
      type: String,
      required: true,
      enum: ['Persoana fizica', 'Persoana juridica'],
    },
    name: { type: String, required: true },

    // ↙––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
    // Required condiționat pe clientType:
    cnp: {
      type: String,
      required: function () {
        return this.clientType === 'Persoana fizica'
      },
    },
    vatId: {
      type: String,
      required: function () {
        return this.clientType === 'Persoana juridica'
      },
    },
    nrRegComert: {
      type: String,
      required: function () {
        return this.clientType === 'Persoana juridica'
      },
    },
    // ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––↘
    isVatPayer: { type: Boolean, default: false },
    email: { type: String },
    phone: { type: String },
    address: { type: String, required: true },
    deliveryAddresses: { type: [String], default: [] },
    bankAccountLei: { type: String },
    bankAccountEuro: { type: String },
    mentions: { type: String },
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
clientSchema.index({ cnp: 1 }, { sparse: true })
clientSchema.index({ phone: 1 }, { sparse: true })
clientSchema.index({ email: 1 }, { sparse: true })
clientSchema.index({ vatId: 1 }, { sparse: true })

const ClientModel = models.Client || model<IClientDoc>('Client', clientSchema)

export default ClientModel
