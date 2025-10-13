import mongoose, { Schema, Document, models, Types } from 'mongoose'
import { IOrderLineItem } from './types' 

// Schema pentru un rând din comandă
const OrderLineItemSchema = new Schema<IOrderLineItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
  isManualEntry: { type: Boolean, default: false, required: true },
  productName: { type: String, required: true },
  productCode: { type: String, default: '' },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  unitOfMeasureCode: { type: String, default: 'H87' },
  priceAtTimeOfOrder: { type: Number, required: true },
  vatRateDetails: {
    rate: { type: Number, required: true },
    value: { type: Number, required: true },
  },
  codNC: { type: String, trim: true },
  codCPV: { type: String, trim: true },
})

// Interfața principală pentru documentul Order
export interface IOrder extends Document {
  _id: string
  orderNumber: string
  client: Types.ObjectId
  salesAgent: Types.ObjectId
  status: 'Ciorna' | 'Confirmata' | 'LivrataPartial' | 'Livrata' | 'Anulata'
  clientSnapshot: {
    name: string
    cui: string
    regCom: string
    address: string
    judet: string
    bank?: string
    iban?: string
  }
  deliveryAddress: {
    judet: string
    localitate: string
    strada: string
    numar: string
    codPostal: string
    alteDetalii?: string
  }
  delegate?: {
    name: string
    idCardSeries: string
    idCardNumber: string
    vehiclePlate: string
  }
  lineItems: Types.DocumentArray<IOrderLineItem>
  totals: {
    subtotal: number
    shippingCost: number
    vatTotal: number
    grandTotal: number
  }
  deliveryType: string
  estimatedVehicleType: string
  estimatedTransportCount: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Schema principală a comenzii
const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    salesAgent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['Ciorna', 'Confirmata', 'LivrataPartial', 'Livrata', 'Anulata'],
      default: 'Ciorna',
    },
    clientSnapshot: {
      name: { type: String, required: true },
      cui: { type: String, required: true },
      regCom: { type: String, required: true },
      address: { type: String, required: true },
      judet: { type: String, required: true },
      bank: { type: String },
      iban: { type: String },
    },
    deliveryAddress: {
      judet: { type: String, required: true },
      localitate: { type: String, required: true },
      strada: { type: String, required: true },
      numar: { type: String, required: true },
      codPostal: { type: String, required: true },
      alteDetalii: { type: String },
    },
    delegate: {
      name: { type: String },
      idCardSeries: { type: String },
      idCardNumber: { type: String },
      vehiclePlate: { type: String },
    },
    lineItems: [OrderLineItemSchema],
    totals: {
      subtotal: { type: Number, required: true, default: 0 },
      shippingCost: { type: Number, required: true, default: 0 },
      vatTotal: { type: Number, required: true, default: 0 },
      grandTotal: { type: Number, required: true, default: 0 },
    },
    deliveryType: { type: String, required: true },
    estimatedVehicleType: { type: String, required: true },
    estimatedTransportCount: { type: Number, default: 1 },
    notes: { type: String },
  },
  { timestamps: true }
)

const Order = models.Order || mongoose.model<IOrder>('Order', OrderSchema)

export default Order
