import { Schema, model, models, Document, Model, Types } from 'mongoose'
import { NIR_STATUSES } from './nir.constants'
import {
  CompanySnapshotDTO,
  SupplierSnapshotDTO,
  NirTotalsDTO,
  NirLineDTO,
} from './nir.types'

export interface INirDoc extends Document {
  _id: Types.ObjectId
  // Header
  nirNumber: string
  seriesName?: string
  sequenceNumber: number
  year: number
  nirDate: Date
  // Relații
  receptionId: Types.ObjectId[]
  supplierId: Types.ObjectId
  // Documente (Arrays)
  invoices: {
    series?: string
    number: string
    date: Date
    amount?: number
    currency?: string
  }[]
  deliveries: {
    dispatchNoteSeries?: string
    dispatchNoteNumber: string
    dispatchNoteDate: Date
  }[]
  // Snapshots
  companySnapshot: CompanySnapshotDTO
  supplierSnapshot: SupplierSnapshotDTO
  // User
  receivedBy: {
    userId: Types.ObjectId
    name: string
  }
  // Linii
  items: NirLineDTO[]
  // Totaluri (Structura din DeliveryNote)
  totals: NirTotalsDTO
  status: (typeof NIR_STATUSES)[number]
  cancellationReason?: string
  cancelledAt?: Date
  cancelledBy?: Types.ObjectId
  cancelledByName?: string
  destinationLocation: string
  orderRef?: string | Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// --- SUB-SCHEME ---

const InvoiceSchema = new Schema(
  {
    series: String,
    number: { type: String, required: true },
    date: { type: Date, required: true },
    amount: Number,
    currency: String,
    vatRate: Number,
    vatValue: Number,
    totalWithVat: Number,
  },
  { _id: false },
)

// Schema pentru Avize (Actualizată cu toate câmpurile)
const DeliverySchema = new Schema(
  {
    dispatchNoteSeries: String,
    dispatchNoteNumber: { type: String, required: true },
    dispatchNoteDate: { type: Date, required: true },
    driverName: String,
    carNumber: String,
    transportType: String,
    transportCost: Number,
    transportVatRate: Number,
    transportVatValue: Number,
    tertiaryTransporterDetails: {
      name: String,
      cui: String,
      regCom: String,
    },
  },
  { _id: false },
)

const SupplierSnapshotSchema = new Schema<SupplierSnapshotDTO>(
  {
    name: { type: String, required: true },
    cui: { type: String, required: true },
  },
  { _id: false },
)

const CompanySnapshotSchema = new Schema<CompanySnapshotDTO>(
  {
    name: { type: String, required: true },
    cui: { type: String, required: true },
    regCom: String,
    address: Schema.Types.Mixed,
    bankAccounts: Schema.Types.Mixed,
    capitalSocial: String,
    phones: Schema.Types.Mixed,
    emails: Schema.Types.Mixed,
  },
  { _id: false },
)
const QualityDetailsSchema = new Schema(
  {
    lotNumbers: [String],
    certificateNumbers: [String],
    testReports: [String],
    additionalNotes: String,
  },
  { _id: false },
)
const NirLineSchema = new Schema<NirLineDTO>(
  {
    receptionLineId: { type: String },
    stockableItemType: {
      type: String,
      enum: ['ERPProduct', 'Packaging'],
      required: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: 'ERPProduct' },
    packagingId: { type: Schema.Types.ObjectId, ref: 'Packaging' },
    productName: { type: String, required: true },
    productCode: { type: String },
    unitMeasure: { type: String, required: true },
    documentQuantity: { type: Number, default: 0 },
    quantity: { type: Number, required: true },
    quantityDifference: { type: Number, default: 0 },
    invoicePricePerUnit: { type: Number, required: true },
    vatRate: { type: Number, required: true },
    distributedTransportCostPerUnit: { type: Number, default: 0 },
    landedCostPerUnit: { type: Number, required: true },
    lineValue: { type: Number, required: true },
    lineVatValue: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    qualityDetails: QualityDetailsSchema,
  },
  { _id: false },
)

// Structura de totaluri aliniată cu DeliveryNote + Specific NIR
const NirTotalsSchema = new Schema<NirTotalsDTO>(
  {
    productsSubtotal: { type: Number, default: 0 },
    productsVat: { type: Number, default: 0 },
    packagingSubtotal: { type: Number, default: 0 },
    packagingVat: { type: Number, default: 0 },
    // Transportul (Allocated)
    transportSubtotal: { type: Number, default: 0 },
    transportVat: { type: Number, default: 0 },
    // Total Document (Factura)
    subtotal: { type: Number, default: 0 }, // Fără TVA
    vatTotal: { type: Number, default: 0 }, // Total TVA
    grandTotal: { type: Number, default: 0 }, // Total Factură
    // Valoare Stoc (Factura + Transport)
    totalEntryValue: { type: Number, default: 0 },
  },
  { _id: false },
)

// --- SCHEMA PRINCIPALĂ ---

const NirSchema = new Schema<INirDoc>(
  {
    nirNumber: { type: String, required: true },
    seriesName: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    year: { type: Number, required: true },
    nirDate: { type: Date, required: true, default: Date.now },
    receptionId: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Reception',
        required: false, 
      },
    ],
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    invoices: [InvoiceSchema],
    deliveries: [DeliverySchema],
    companySnapshot: { type: CompanySnapshotSchema, required: true },
    supplierSnapshot: { type: SupplierSnapshotSchema, required: true },
    receivedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
    },
    items: [NirLineSchema],
    totals: { type: NirTotalsSchema, required: true },
    status: { type: String, enum: NIR_STATUSES, default: 'CONFIRMED' },
    destinationLocation: {
      type: String,
      required: true, // E critic să știm unde e marfa, deci required
    },
    orderRef: {
      type: Schema.Types.ObjectId,
      ref: 'SupplierOrder',
      default: null,
    },
    cancellationReason: String,
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledByName: String,
  },
  { timestamps: true },
)

NirSchema.index({ seriesName: 1, sequenceNumber: 1, year: 1 }, { unique: true })
NirSchema.index({ receptionId: 1 })

const NirModel =
  (models.Nir as Model<INirDoc>) || model<INirDoc>('Nir', NirSchema)
export default NirModel
