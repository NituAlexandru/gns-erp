import { Schema, model, models, Document, Model, Types } from 'mongoose'
import { ICostBreakdownBatch } from './types'
import { IQualityDetails } from './inventory.model'

const QualityDetailsSchema = new Schema(
  {
    // Aici sunt ȘARJELE (ce scrie pe produs/etichetă de la fabrică)
    lotNumbers: { type: [String], default: [] },
    // Aici sunt NUMERELE DE CERTIFICAT (hârtiile de la furnizor)
    certificateNumbers: { type: [String], default: [] },
    // Aici sunt RAPOARTELE DE ÎNCERCĂRI (dacă există, ex: la betoane/fier)
    testReports: { type: [String], default: [] },
    // Aici sunt MENȚIUNI SUPLIMENTARE (orice altceva scris de gestionar)
    additionalNotes: { type: String },
  },
  { _id: false },
)

export interface IStockMovementDoc extends Document {
  stockableItem: Types.ObjectId
  stockableItemType: 'ERPProduct' | 'Packaging'
  movementType: string
  quantity: number
  unitMeasure?: string
  locationFrom?: string
  locationTo?: string
  referenceId?: Types.ObjectId
  responsibleUser?: Types.ObjectId
  responsibleUserName?: string
  note?: string
  timestamp: Date
  balanceBefore: number
  status: 'ACTIVE' | 'CANCELLED'
  balanceAfter: number
  unitCost?: number // Costul unitar (pt INTRARI) sau Costul Mediu FIFO (pt IESIRI)
  salePrice?: number
  lineCost?: number // Costul total al mișcării
  costBreakdown?: ICostBreakdownBatch[] // Detalierea loturilor (doar pt IESIRI)
  supplierId?: Types.ObjectId
  supplierName?: string
  clientId?: Types.ObjectId
  documentNumber?: string
  qualityDetails?: IQualityDetails
  createdAt: Date
  updatedAt: Date
  orderRef?: Types.ObjectId
  supplierOrderNumber?: string
  receptionRef?: Types.ObjectId | { _id: Types.ObjectId }
}

export const CostBreakdownBatchSchema = new Schema<ICostBreakdownBatch>(
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
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    qualityDetails: { type: QualityDetailsSchema },
  },
  { _id: false },
)

const StockMovementSchema = new Schema<IStockMovementDoc>(
  {
    stockableItemType: {
      type: String,
      required: true,
      enum: ['ERPProduct', 'Packaging'],
    },
    stockableItem: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'stockableItemType',
    },
    movementType: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    unitMeasure: { type: String },
    locationFrom: { type: String },
    locationTo: { type: String },
    referenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Reception',
      required: true,
    },
    responsibleUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    responsibleUserName: { type: String, required: false },
    note: { type: String },
    timestamp: { type: Date, default: () => new Date() },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED'],
      default: 'ACTIVE',
      required: true,
      index: true,
    },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    unitCost: { type: Number, required: false },
    salePrice: { type: Number, required: false },
    lineCost: { type: Number, required: false },
    costBreakdown: { type: [CostBreakdownBatchSchema], required: false },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierName: { type: String },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: false },
    documentNumber: { type: String, required: false },
    qualityDetails: { type: QualityDetailsSchema },
    receptionRef: { type: Schema.Types.ObjectId, ref: 'Reception' },
    orderRef: { type: Schema.Types.ObjectId, ref: 'SupplierOrder' },
    supplierOrderNumber: { type: String },
  },
  { timestamps: true },
)

const StockMovementModel: Model<IStockMovementDoc> =
  (models.StockMovement as Model<IStockMovementDoc>) ||
  model<IStockMovementDoc>('StockMovement', StockMovementSchema)

export default StockMovementModel
