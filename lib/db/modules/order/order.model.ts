import mongoose, { Schema, Document, models, Types } from 'mongoose'
import { IOrderLineItem } from './types'

// Schema pentru un rând din comandă
const OrderLineItemSchema = new Schema<IOrderLineItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
  isManualEntry: { type: Boolean, default: false, required: true },
  isPerDelivery: { type: Boolean, default: false },
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
  status:
    | 'DRAFT'
    | 'CONFIRMED'
    | 'IN_DELIVERY'
    | 'PARTIALLY_DELIVERED'
    | 'DELIVERED'
    | 'INVOICED'
    | 'COMPLETED'
    | 'CANCELLED'
  entityType: 'client' | 'project'
  projectId?: Types.ObjectId
  clientSnapshot: {
    name: string
    cui: string
    regCom: string
    address: string
    judet: string
    bank?: string
    iban?: string
    balanceAtCreation?: number
    statusAtCreation?: string
    estimatedProfitRON?: number
    estimatedProfitPercent?: number
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
      enum: [
        'DRAFT',
        'CONFIRMED',
        'IN_DELIVERY',
        'PARTIALLY_DELIVERED',
        'DELIVERED',
        'INVOICED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'DRAFT',
      index: true,
    },
    entityType: {
      type: String,
      enum: ['client', 'project'],
      required: true,
      default: 'client',
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    clientSnapshot: {
      name: { type: String, required: true },
      cui: { type: String, required: true },
      regCom: { type: String, required: true },
      address: { type: String, required: true },
      judet: { type: String, required: true },
      bank: { type: String },
      iban: { type: String },
      balanceAtCreation: { type: Number },
      statusAtCreation: { type: String },
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
      estimatedProfitRON: { type: Number },
      estimatedProfitPercent: { type: Number },
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
