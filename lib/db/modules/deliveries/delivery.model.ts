import mongoose, { Schema, Document, models, Types, Model } from 'mongoose'
import { DELIVERY_SLOTS } from './constants'
import { DeliveryStatusKey } from './types'

export interface ClientSnapshot {
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
// Schema pentru ClientSnapshot
export const ClientSnapshotSchema = new Schema<ClientSnapshot>(
  {
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
  { _id: false }
)

export interface DeliveryAddress {
  judet: string
  localitate: string
  strada: string
  numar: string
  codPostal: string
  alteDetalii?: string
}

export const DeliveryAddressSchema = new Schema<DeliveryAddress>(
  {
    judet: { type: String, required: true },
    localitate: { type: String, required: true },
    strada: { type: String, required: true },
    numar: { type: String, required: true },
    codPostal: { type: String, required: true },
    alteDetalii: { type: String },
  },
  { _id: false }
)
export interface SalesAgentSnapshot {
  name: string
}

export const SalesAgentSnapshotSchema = new Schema<SalesAgentSnapshot>(
  {
    name: { type: String, required: true },
  },
  { _id: false }
)

const PackagingOptionSchema = new Schema(
  {
    unitName: { type: String, required: true },
    baseUnitEquivalent: { type: Number, required: true },
  },
  { _id: false }
)

export interface IDeliveryLineItem extends Types.Subdocument {
  _id: Types.ObjectId
  orderLineItemId?: Types.ObjectId
  productId?: Types.ObjectId
  serviceId?: Types.ObjectId
  isManualEntry: boolean
  isPerDelivery?: boolean
  productName: string
  productCode: string
  quantity: number
  unitOfMeasure: string
  unitOfMeasureCode?: string
  priceAtTimeOfOrder: number
  minimumSalePrice?: number
  lineValue: number
  lineVatValue: number
  lineTotal: number
  vatRateDetails: { rate: number; value: number }
  stockableItemType?: 'ERPProduct' | 'Packaging'
  baseUnit?: string
  conversionFactor?: number
  quantityInBaseUnit?: number
  priceInBaseUnit?: number
  packagingOptions: { unitName: string; baseUnitEquivalent: number }[]
}

export const DeliveryLineItemSchema = new Schema<IDeliveryLineItem>({
  orderLineItemId: { type: Schema.Types.ObjectId, ref: 'Order.lineItems' },
  productId: { type: Schema.Types.ObjectId, refPath: 'stockableItemType' },
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
  isManualEntry: { type: Boolean, default: false },
  isPerDelivery: { type: Boolean, default: false },
  productName: { type: String, required: true },
  productCode: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitOfMeasure: { type: String, required: true },
  unitOfMeasureCode: { type: String },
  priceAtTimeOfOrder: { type: Number, required: true },
  minimumSalePrice: { type: Number },
  lineValue: { type: Number, required: true },
  lineVatValue: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
  vatRateDetails: {
    rate: { type: Number, required: true },
    value: { type: Number, required: true },
  },
  stockableItemType: { type: String, enum: ['ERPProduct', 'Packaging'] },
  baseUnit: { type: String },
  conversionFactor: { type: Number },
  quantityInBaseUnit: { type: Number },
  priceInBaseUnit: { type: Number },
  packagingOptions: [PackagingOptionSchema],
})

export interface IDelivery extends Document {
  _id: Types.ObjectId
  deliveryNumber: string
  orderId: Types.ObjectId
  orderNumber: string
  client: Types.ObjectId
  clientSnapshot: ClientSnapshot
  salesAgent: Types.ObjectId
  salesAgentSnapshot: SalesAgentSnapshot
  deliveryAddress: DeliveryAddress
  deliveryAddressId: Types.ObjectId
  requestedDeliveryDate: Date
  requestedDeliverySlots: string[]
  deliveryDate?: Date
  deliverySlots?: string[]
  vehicleType: string
  deliveryNotes?: string
  orderNotes?: string
  uitCode?: string
  status: DeliveryStatusKey
  assemblyId?: Types.ObjectId
  driverName?: string
  vehicleNumber?: string
  trailerNumber?: string
  driverId?: Types.ObjectId
  vehicleId?: Types.ObjectId
  trailerId?: Types.ObjectId
  isNoticed: boolean
  isInvoiced: boolean
  createdBy: Types.ObjectId
  createdByName: string
  lastUpdatedBy?: Types.ObjectId
  lastUpdatedByName?: string
  items: Types.DocumentArray<IDeliveryLineItem>
  totals: {
    productsSubtotal: number
    productsVat: number
    servicesSubtotal: number
    servicesVat: number
    manualSubtotal: number
    manualVat: number
    subtotal: number
    vatTotal: number
    grandTotal: number
  }
  createdAt: Date
  updatedAt: Date
}

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryNumber: { type: String, required: true, unique: true, index: true },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    salesAgent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deliveryAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryAddress',
      required: true,
    },
    orderNumber: { type: String, required: true, index: true },
    clientSnapshot: { type: ClientSnapshotSchema, required: true },
    salesAgentSnapshot: { type: SalesAgentSnapshotSchema, required: true },
    deliveryAddress: { type: DeliveryAddressSchema, required: true }, // Snapshot-ul adresei
    requestedDeliveryDate: { type: Date, required: true },
    requestedDeliverySlots: {
      type: [String],
      enum: DELIVERY_SLOTS,
      required: true,
    },
    deliveryDate: { type: Date },
    deliverySlots: { type: [String], enum: DELIVERY_SLOTS },
    vehicleType: { type: String, required: true },
    deliveryNotes: { type: String },
    orderNotes: { type: String },
    uitCode: { type: String },
    status: {
      type: String,
      enum: [
        'CREATED',
        'SCHEDULED',
        'IN_TRANSIT',
        'DELIVERED',
        'INVOICED',
        'CANCELLED',
      ],
      default: 'CREATED',
      required: true,
      index: true,
    },
    assemblyId: { type: Schema.Types.ObjectId, ref: 'Assignment', index: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    trailerId: { type: Schema.Types.ObjectId, ref: 'Trailer' },
    driverName: { type: String },
    vehicleNumber: { type: String },
    trailerNumber: { type: String },
    isNoticed: { type: Boolean, default: false, index: true },
    isInvoiced: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastUpdatedByName: { type: String },
    items: [DeliveryLineItemSchema],
    totals: {
      productsSubtotal: { type: Number, default: 0 },
      productsVat: { type: Number, default: 0 },
      servicesSubtotal: { type: Number, default: 0 },
      servicesVat: { type: Number, default: 0 },
      manualSubtotal: { type: Number, default: 0 },
      manualVat: { type: Number, default: 0 },
      subtotal: { type: Number, required: true, default: 0 },
      vatTotal: { type: Number, required: true, default: 0 },
      grandTotal: { type: Number, required: true, default: 0 },
    },
  },
  { timestamps: true }
)

DeliverySchema.path('status').validate(function (value) {
  if (
    value === 'SCHEDULED' &&
    (!this.deliverySlots || this.deliverySlots.length === 0)
  ) {
    return false // Invalidează dacă e SCHEDULED și nu are sloturi
  }
  return true
}, 'Intervalele orare (deliverySlots) sunt obligatorii pentru o livrare programată (SCHEDULED).')

DeliverySchema.path('status').validate(function (value) {
  if (value === 'SCHEDULED' && !this.assemblyId) {
    return false // Invalidează dacă e SCHEDULED și nu are ansamblu
  }
  return true
}, 'Ansamblul (assemblyId) este obligatoriu pentru o livrare programată (SCHEDULED).')

const DeliveryModel: Model<IDelivery> =
  (models.Delivery as Model<IDelivery>) ||
  mongoose.model<IDelivery>('Delivery', DeliverySchema)

export default DeliveryModel
