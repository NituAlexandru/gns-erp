import mongoose, { Schema, Document, models, Types } from 'mongoose'
import { IOrderLineItem } from './types'

// Schema pentru un rând din comandă
const OrderLineItemSchema = new Schema<IOrderLineItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'ERPProduct', default: null },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
  isManualEntry: { type: Boolean, default: false, required: true },
  isPerDelivery: { type: Boolean, default: false },
  productName: { type: String, required: true },
  productCode: { type: String, default: '' },
  productBarcode: { type: String, default: '' },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  unitOfMeasureCode: { type: String, default: 'H87' },
  priceAtTimeOfOrder: { type: Number, required: true },
  cost: { type: Number, default: 0 },
  minimumSalePrice: { type: Number, required: false },
  lineValue: { type: Number, required: true },
  lineVatValue: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
  vatRateDetails: {
    rate: { type: Number, required: true },
    value: { type: Number, required: true },
  },
  codNC: { type: String, trim: true },
  codCPV: { type: String, trim: true },
  quantityShipped: { type: Number, required: true, default: 0 },
  stockableItemType: { type: String, enum: ['ERPProduct', 'Packaging'] },
  baseUnit: { type: String },
  conversionFactor: { type: Number },
  quantityInBaseUnit: { type: Number },
  priceInBaseUnit: { type: Number },
  packagingOptions: [
    {
      _id: false,
      unitName: { type: String, required: true },
      baseUnitEquivalent: { type: Number, required: true },
    },
  ],
})

// Interfața principală pentru documentul Order
export interface IOrder extends Document {
  _id: string
  orderNumber: string
  client: Types.ObjectId
  salesAgent: Types.ObjectId
  salesAgentSnapshot: {
    name: string
  }
  status:
    | 'DRAFT'
    | 'CONFIRMED'
    | 'SCHEDULED'
    | 'PARTIALLY_DELIVERED'
    | 'DELIVERED'
    | 'PARTIALLY_INVOICED'
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
  }
  deliveryAddress: {
    judet: string
    localitate: string
    strada: string
    numar: string
    codPostal: string
    alteDetalii?: string
    persoanaContact?: string
    telefonContact?: string
  }
  deliveryAddressId?: Types.ObjectId
  delegate?: {
    name: string
    idCardSeries: string
    idCardNumber: string
    vehiclePlate: string
  }
  lineItems: Types.DocumentArray<IOrderLineItem>
  totals: {
    productsSubtotal: number
    productsVat: number
    packagingSubtotal: number
    packagingVat: number
    servicesSubtotal: number
    servicesVat: number
    manualSubtotal: number
    manualVat: number
    subtotal: number
    vatTotal: number
    grandTotal: number
  }
  deliveryType: string
  isThirdPartyHauler: boolean
  estimatedVehicleType?: string
  estimatedTransportCount: number
  distanceInKm?: number
  travelTimeInMinutes?: number
  recommendedShippingCost?: number
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
    salesAgentSnapshot: {
      name: { type: String, required: true },
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'CONFIRMED',
        'SCHEDULED',
        'PARTIALLY_DELIVERED',
        'DELIVERED',
        'PARTIALLY_INVOICED',
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
      persoanaContact: { type: String },
      telefonContact: { type: String },
    },
    deliveryAddressId: { type: Schema.Types.ObjectId },
    delegate: {
      name: { type: String },
      idCardSeries: { type: String },
      idCardNumber: { type: String },
      vehiclePlate: { type: String },
    },
    lineItems: [OrderLineItemSchema],
    recommendedShippingCost: { type: Number, default: 0 },
    totals: {
      productsSubtotal: { type: Number, default: 0 },
      productsVat: { type: Number, default: 0 },
      packagingSubtotal: { type: Number, default: 0 },
      packagingVat: { type: Number, default: 0 },
      servicesSubtotal: { type: Number, default: 0 },
      servicesVat: { type: Number, default: 0 },
      manualSubtotal: { type: Number, default: 0 },
      manualVat: { type: Number, default: 0 },
      subtotal: { type: Number, required: true, default: 0 },
      vatTotal: { type: Number, required: true, default: 0 },
      grandTotal: { type: Number, required: true, default: 0 },
    },
    deliveryType: { type: String, required: true },
    isThirdPartyHauler: { type: Boolean, default: false },
    estimatedVehicleType: { type: String },
    estimatedTransportCount: { type: Number, default: 1 },
    distanceInKm: { type: Number },
    travelTimeInMinutes: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
)

const Order = models.Order || mongoose.model<IOrder>('Order', OrderSchema)

export default Order
