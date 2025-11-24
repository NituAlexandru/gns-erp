import { Schema, model, models, Document, Model, Types } from 'mongoose'
import {
  DELIVERY_NOTE_STATUSES,
  E_TRANSPORT_STATUSES,
} from './delivery-note.constants'

// -------------------------------------------------------------
// Interfaces
// -------------------------------------------------------------
export interface ICompanySnapshot {
  name: string
  cui: string
  regCom: string
  address: {
    judet: string
    localitate: string
    strada: string
    numar?: string
    codPostal: string // Obligatoriu
    tara: string // Obligatoriu (ex: "RO")
    alteDetalii?: string
  }
  email: string // Default
  phone: string // Default
  bank: string // Default
  iban: string // Default
  currency: string // Default (ex: "RON")
}

// --- Interfața pentru detaliile loturilor (pt. audit FIFO) ---
export interface ICostBreakdown {
  movementId?: Types.ObjectId // ID-ul mișcării de INTRARE
  entryDate: Date // Data intrării
  quantity: number // Cât s-a consumat din acest lot
  unitCost: number // Costul lotului respectiv
  type: 'REAL' | 'PROVISIONAL'
}

export interface IDeliveryNoteLine {
  _id: Types.ObjectId
  orderLineItemId?: Types.ObjectId
  productId?: Types.ObjectId
  codNC?: string
  serviceId?: Types.ObjectId
  stockableItemType?: 'ERPProduct' | 'Packaging'
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
  unitCostFIFO?: number // Costul FIFO per unitatea de BAZĂ
  lineCostFIFO?: number // Costul FIFO total al liniei
  costBreakdown?: ICostBreakdown[]
  vatRateDetails: { rate: number; value: number }
  baseUnit?: string
  conversionFactor?: number
  quantityInBaseUnit?: number
  priceInBaseUnit?: number
  packagingOptions: { unitName: string; baseUnitEquivalent: number }[]
}

export interface IDeliveryNoteTotals {
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

export interface IDeliveryNoteDoc extends Document {
  _id: Types.ObjectId
  noteNumber: string
  seriesName: string
  sequenceNumber: number
  year: number
  deliveryId: Types.ObjectId
  orderId: Types.ObjectId
  orderNumberSnapshot: string
  deliveryNumberSnapshot: string
  clientId: Types.ObjectId
  deliveryAddressId: Types.ObjectId
  salesAgentId: Types.ObjectId
  salesAgentSnapshot: { name: string }
  status: (typeof DELIVERY_NOTE_STATUSES)[number]
  isInvoiced: boolean
  createdBy: Types.ObjectId
  createdByName: string
  lastUpdatedBy?: Types.ObjectId
  lastUpdatedByName?: string
  cancellationReason?: string
  cancelledAt?: Date
  cancelledBy?: Types.ObjectId
  cancelledByName?: string
  companySnapshot: ICompanySnapshot
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
    tara?: string
    persoanaContact?: string
    telefonContact?: string
  }
  items: IDeliveryNoteLine[]
  totals: IDeliveryNoteTotals
  eTransportStatus: (typeof E_TRANSPORT_STATUSES)[number]
  eTransportCode?: string
  vehicleRegistration?: string
  transportCompany?: string
  createdAt: Date
  updatedAt: Date
}

// -------------------------------------------------------------
// Schemas
// -------------------------------------------------------------
const CostBreakdownSchema = new Schema<ICostBreakdown>(
  {
    movementId: {
      type: Schema.Types.ObjectId,
      ref: 'StockMovement',
      required: false,
    },
    entryDate: { type: Date, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number, required: true },
    type: {
      type: String,
      enum: ['REAL', 'PROVISIONAL'],
      required: true,
      default: 'REAL',
    },
  },
  { _id: false }
)

const DeliveryNoteLineSchema = new Schema<IDeliveryNoteLine>(
  {
    orderLineItemId: { type: Schema.Types.ObjectId, ref: 'OrderLineItem' },
    productId: { type: Schema.Types.ObjectId, ref: 'ERPProduct' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    stockableItemType: { type: String, enum: ['ERPProduct', 'Packaging'] },
    isManualEntry: { type: Boolean, required: true },
    isPerDelivery: { type: Boolean },
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
    baseUnit: { type: String },
    conversionFactor: { type: Number },
    quantityInBaseUnit: { type: Number },
    priceInBaseUnit: { type: Number },
    packagingOptions: [
      {
        unitName: { type: String, required: true },
        baseUnitEquivalent: { type: Number, required: true },
      },
    ],
    unitCostFIFO: { type: Number, required: false },
    lineCostFIFO: { type: Number, required: false },
    costBreakdown: { type: [CostBreakdownSchema], required: false },
  },
  { _id: true }
)

const DeliveryNoteTotalsSchema = new Schema<IDeliveryNoteTotals>(
  {
    productsSubtotal: { type: Number, required: true },
    productsVat: { type: Number, required: true },
    packagingSubtotal: { type: Number, required: true, default: 0 },
    packagingVat: { type: Number, required: true, default: 0 },
    servicesSubtotal: { type: Number, required: true },
    servicesVat: { type: Number, required: true },
    manualSubtotal: { type: Number, required: true },
    manualVat: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    vatTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
  },
  { _id: false }
)

const SnapshotAddressSchema = new Schema(
  {
    judet: { type: String, required: true },
    localitate: { type: String, required: true },
    strada: { type: String, required: true },
    numar: { type: String },
    codPostal: { type: String, required: true },
    tara: { type: String, required: true },
    alteDetalii: { type: String },
  },
  { _id: false }
)
const CompanySnapshotSchema = new Schema<ICompanySnapshot>(
  {
    name: { type: String, required: true },
    cui: { type: String, required: true },
    regCom: { type: String, required: true },
    address: { type: SnapshotAddressSchema, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    bank: { type: String, required: true },
    iban: { type: String, required: true },
    currency: { type: String, required: true },
  },
  { _id: false }
)
const DeliveryNoteSchema = new Schema<IDeliveryNoteDoc>(
  {
    noteNumber: { type: String, required: true },
    seriesName: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    year: { type: Number, required: true },
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
      required: true,
    },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    orderNumberSnapshot: { type: String, required: true },
    deliveryNumberSnapshot: { type: String, required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    deliveryAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryAddress',
      required: true,
    },
    status: {
      type: String,
      enum: DELIVERY_NOTE_STATUSES,
      default: 'IN_TRANSIT',
    },
    isInvoiced: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastUpdatedByName: { type: String },
    cancellationReason: { type: String, required: false },
    cancelledAt: { type: Date, required: false },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    cancelledByName: { type: String, required: false },
    companySnapshot: { type: CompanySnapshotSchema, required: true },
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
      tara: { type: String, default: 'RO' },
      persoanaContact: { type: String },
      telefonContact: { type: String },
    },
    salesAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    salesAgentSnapshot: {
      name: { type: String, required: true },
    },
    items: [DeliveryNoteLineSchema],
    totals: DeliveryNoteTotalsSchema,
    eTransportStatus: {
      type: String,
      enum: E_TRANSPORT_STATUSES,
      default: 'NOT_REQUIRED',
    },
    eTransportCode: { type: String },
    vehicleRegistration: { type: String },
    transportCompany: { type: String },
  },
  { timestamps: true }
)

DeliveryNoteSchema.index(
  { seriesName: 1, sequenceNumber: 1, year: 1 },
  { unique: true }
)

const DeliveryNoteModel: Model<IDeliveryNoteDoc> =
  (models.DeliveryNote as Model<IDeliveryNoteDoc>) ||
  model<IDeliveryNoteDoc>('DeliveryNote', DeliveryNoteSchema)

export default DeliveryNoteModel
