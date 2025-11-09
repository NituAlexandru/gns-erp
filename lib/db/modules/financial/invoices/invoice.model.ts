import { Schema, model, models, Document, Model, Types } from 'mongoose'
import {
  InvoiceStatusKey,
  EFacturaStatusKey,
  ClientSnapshot,
  CompanySnapshot,
  InvoiceTotals,
  InvoiceLineInput,
} from './invoice.types'
import {
  ADVANCE_SCOPES,
  AdvanceScopeKey,
  EFACTURA_STATUSES,
  INVOICE_STATUSES,
} from './invoice.constants'
import { CostBreakdownBatchSchema } from '../../inventory/movement.model'

// --- Interfața Documentului Mongoose ---
export interface IInvoiceDoc extends Document {
  _id: Types.ObjectId
  sequenceNumber: number
  invoiceNumber: string
  seriesName: string
  year: number
  invoiceDate: Date
  dueDate: Date
  clientId: Types.ObjectId
  clientSnapshot: ClientSnapshot
  companySnapshot: CompanySnapshot
  items: (InvoiceLineInput & { _id: Types.ObjectId })[]
  totals: InvoiceTotals
  sourceDeliveryNotes: Types.ObjectId[]
  relatedOrders: Types.ObjectId[]
  relatedDeliveries: Types.ObjectId[]
  status: InvoiceStatusKey
  rejectionReason?: string
  eFacturaStatus: EFacturaStatusKey
  eFacturaError?: string
  eFacturaUploadId?: string
  invoiceType: 'STANDARD' | 'STORNO' | 'AVANS' | 'PROFORMA'
  relatedInvoiceIds: Types.ObjectId[] // Pt Storno (leagă facturile stornate)
  relatedAdvanceIds: Types.ObjectId[] // Pt Standard (leagă avansurile folosite)
  notes?: string
  createdBy: Types.ObjectId
  createdByName: string
  approvedBy?: Types.ObjectId
  approvedByName?: string
  salesAgentId: Types.ObjectId
  salesAgentSnapshot: { name: string }
  deliveryAddressId: Types.ObjectId
  deliveryAddress: ClientSnapshot['address']
  logisticSnapshots: {
    orderNumbers: string[]
    deliveryNumbers: string[]
    deliveryNoteNumbers: string[]
  }
  paidAmount: number
  remainingAmount: number
  advanceScope?: AdvanceScopeKey
  createdAt: Date
  updatedAt: Date
}

// --- Sub-schemele ---
const FiscalAddressSubSchema = new Schema(
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

const CompanySnapshotSubSchema = new Schema<CompanySnapshot>(
  {
    name: { type: String, required: true },
    cui: { type: String, required: true },
    regCom: { type: String, required: true },
    address: { type: FiscalAddressSubSchema, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    bank: { type: String, required: true },
    iban: { type: String, required: true },
    currency: { type: String, required: true },
  },
  { _id: false }
)

const ClientSnapshotSubSchema = new Schema<ClientSnapshot>(
  {
    name: { type: String, required: true },
    cui: { type: String, required: true },
    regCom: { type: String, required: true },
    address: { type: FiscalAddressSubSchema, required: true },
    bank: { type: String },
    iban: { type: String },
  },
  { _id: false }
)

const InvoiceLineSubSchema = new Schema<InvoiceLineInput>(
  {
    sourceDeliveryNoteId: { type: Schema.Types.ObjectId, ref: 'DeliveryNote' },
    sourceDeliveryNoteLineId: { type: Schema.Types.ObjectId },
    productId: { type: Schema.Types.ObjectId, ref: 'ERPProduct' },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
    stockableItemType: {
      type: String,
      enum: ['ERPProduct', 'Packaging', 'Service'],
    },
    isManualEntry: { type: Boolean, default: false },
    productName: { type: String, required: true },
    productCode: { type: String },
    quantity: { type: Number, required: true },
    unitOfMeasure: { type: String, required: true },
    unitOfMeasureCode: { type: String },
    codNC: { type: String },
    baseUnit: { type: String },
    minimumSalePrice: { type: Number },
    packagingOptions: [
      {
        _id: false,
        unitName: String,
        baseUnitEquivalent: Number,
      },
    ],
    unitPrice: { type: Number, required: true },
    lineValue: { type: Number, required: true },
    vatRateDetails: {
      rate: { type: Number, required: true },
      value: { type: Number, required: true },
    },
    lineTotal: { type: Number, required: true },
    lineCostFIFO: { type: Number },
    lineProfit: { type: Number, default: 0 },
    lineMargin: { type: Number, default: 0 },
    costBreakdown: { type: [CostBreakdownBatchSchema], default: [] },
    stornedQuantity: { type: Number, default: 0 },
    relatedAdvanceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: false,
    },
  },
  { _id: true }
) // Permitem _id pe linii

const InvoiceTotalsSubSchema = new Schema<InvoiceTotals>(
  {
    productsSubtotal: { type: Number, default: 0 },
    productsVat: { type: Number, default: 0 },

    packagingSubtotal: { type: Number, default: 0 },
    packagingVat: { type: Number, default: 0 },

    servicesSubtotal: { type: Number, default: 0 },
    servicesVat: { type: Number, default: 0 },
    manualSubtotal: { type: Number, default: 0 },
    manualVat: { type: Number, default: 0 },

    // Totaluri generale
    subtotal: { type: Number, required: true },
    vatTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },

    // Defalcare profitabilitate
    productsCost: { type: Number, default: 0 },
    productsProfit: { type: Number, default: 0 },
    productsMargin: { type: Number, default: 0 },

    packagingCost: { type: Number, default: 0 },
    packagingProfit: { type: Number, default: 0 },
    packagingMargin: { type: Number, default: 0 },

    servicesCost: { type: Number, default: 0 },
    servicesProfit: { type: Number, default: 0 },
    servicesMargin: { type: Number, default: 0 },

    manualCost: { type: Number, default: 0 },
    manualProfit: { type: Number, default: 0 },
    manualMargin: { type: Number, default: 0 },

    totalCost: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    profitMargin: { type: Number, default: 0 },
  },
  { _id: false }
)

// --- Schema Principală a Facturii ---
const InvoiceSchema = new Schema<IInvoiceDoc>(
  {
    sequenceNumber: { type: Number, required: true },
    invoiceNumber: { type: String, required: true, index: true },
    seriesName: { type: String, required: true },
    year: { type: Number, required: true, index: true },
    invoiceDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    clientSnapshot: { type: ClientSnapshotSubSchema, required: true },
    companySnapshot: { type: CompanySnapshotSubSchema, required: true },
    items: [InvoiceLineSubSchema],
    totals: { type: InvoiceTotalsSubSchema, required: true },
    sourceDeliveryNotes: [{ type: Schema.Types.ObjectId, ref: 'DeliveryNote' }],
    relatedOrders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    relatedDeliveries: [{ type: Schema.Types.ObjectId, ref: 'Delivery' }],
    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: 'CREATED',
      required: true,
      index: true,
    },
    rejectionReason: { type: String },
    eFacturaStatus: {
      type: String,
      enum: EFACTURA_STATUSES,
      default: 'PENDING', // Presupunem 'PENDING' odată ce e 'APPROVED'
      required: true,
    },
    eFacturaError: { type: String },
    eFacturaUploadId: { type: String },
    invoiceType: {
      type: String,
      enum: ['STANDARD', 'STORNO', 'AVANS', 'PROFORMA'],
      default: 'STANDARD',
      required: true,
    },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedByName: { type: String },
    salesAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    salesAgentSnapshot: { name: { type: String, required: true } },
    logisticSnapshots: {
      orderNumbers: [{ type: String }],
      deliveryNumbers: [{ type: String }],
      deliveryNoteNumbers: [{ type: String }],
    },
    deliveryAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryAddress',
      required: true,
    },
    deliveryAddress: {
      type: FiscalAddressSubSchema,
      required: true,
    },
    relatedInvoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    relatedAdvanceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    advanceScope: {
      type: String,
      enum: ADVANCE_SCOPES,
      default: 'GLOBAL',
    },
  },
  { timestamps: true }
)

InvoiceSchema.pre('save', function (next) {
  if (this.isNew) {
    this.paidAmount = 0
    this.remainingAmount = this.totals.grandTotal
  }
  next()
})

// Index compus pentru unicitatea Seriei+Numărului
InvoiceSchema.index(
  { seriesName: 1, sequenceNumber: 1, year: 1 },
  { unique: true }
)

const InvoiceModel: Model<IInvoiceDoc> =
  (models.Invoice as Model<IInvoiceDoc>) ||
  model<IInvoiceDoc>('Invoice', InvoiceSchema)

export default InvoiceModel
