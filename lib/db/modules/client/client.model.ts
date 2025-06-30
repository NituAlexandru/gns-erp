import { Document, Model, model, models, Schema, Types } from 'mongoose'
import { IClientInput } from './types'

export interface IClientDoc extends Document, IClientInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

const clientAdressSchema = new Schema(
  {
    country: { type: String, required: true },
    province: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    postalCode: { type: String, required: true },
    label: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
)
const clientSchema = new Schema(
  {
    clientType: {
      type: String,
      required: true,
      enum: ['persoana fizica', 'persoana juridica'],
    },
    name: { type: String, required: true },
    cnp: { type: String },
    cui: { type: String },
    isVatPayer: { type: Boolean, default: false },
    vatId: {
      type: String,
      default: true,
    },
    nrRegComert: { type: String },
    email: { type: String },
    phone: { type: String },
    addresses: { type: [clientAdressSchema], default: [] },
    iban: { type: String },
    // Referințe către alte documente asociate clientului
    orders: [{ type: Types.ObjectId, ref: 'Order' }],
    invoices: [{ type: Types.ObjectId, ref: 'Invoice' }],
    avizes: [{ type: Types.ObjectId, ref: 'Aviz' }],
    deliveries: [{ type: Types.ObjectId, ref: 'Delivery' }],
    // Câmpuri denormalizate pentru a îmbunătăți scalabilitatea și performanța
    totalOrders: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalDeliveries: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalCosts: { type: Number, default: 0 }, // costurile totale suportate
    // Mark-up-uri preferențiale pe toate produsele (procente)
    defaultMarkups: {
      directDeliveryPrice: { type: Number, default: 0 },
      fullTruckPrice: { type: Number, default: 0 },
      smallDeliveryBusinessPrice: { type: Number, default: 0 },
      retailPrice: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
)

clientSchema.index({ cnp: 1 }, { sparse: true })
clientSchema.index({ cui: 1 }, { sparse: true })
clientSchema.index({ phone: 1 }, { sparse: true })
clientSchema.index({ email: 1 }, { sparse: true })
clientSchema.index({ vatId: 1 }, { sparse: true })

// Exportarea singleton-ului modelului "Client"
const ClientModel: Model<IClientDoc> =
  (models.Client as Model<IClientDoc>) ||
  model<IClientDoc>('Client', clientSchema)

export default ClientModel
