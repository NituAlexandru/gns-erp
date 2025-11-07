import { Schema, model, models, Document, Model, Types } from 'mongoose'
import { CostBreakdownBatchSchema } from '../../inventory/movement.model' // Importăm schema costului
import { ICostBreakdown } from '../delivery-notes/delivery-note.model'
import { RETURN_NOTE_REASONS, RETURN_NOTE_STATUSES } from './return-note.constants'

// Interfața pentru o linie de retur
export interface IReturnNoteLine {
  _id: Types.ObjectId
  productId: Types.ObjectId
  stockableItemType: 'ERPProduct' | 'Packaging'

  productName: string
  productCode: string

  quantity: number 
  unitOfMeasure: string
  baseUnit: string
  quantityInBaseUnit: number

  // Costul la care a IEȘIT marfa, preluat de pe linia de factură/aviz
  costBreakdown: ICostBreakdown[]
  unitCost: number // Costul mediu ponderat al ieșirii originale

  // Legătura cu documentul original
  sourceInvoiceLineId?: Types.ObjectId
  sourceDeliveryNoteLineId?: Types.ObjectId
}

// Interfața pentru documentul principal
export interface IReturnNoteDoc extends Document {
  _id: Types.ObjectId
  seriesName: string
  sequenceNumber: number
  returnNoteNumber: string // "NR-00001"
  returnNoteDate: Date

  clientId: Types.ObjectId
  deliveryAddressId: Types.ObjectId // Adresa de unde se ridică marfa

  status: (typeof RETURN_NOTE_STATUSES)[number]
  reason: (typeof RETURN_NOTE_REASONS)[number]

  notes?: string

  // Legături
  relatedInvoiceId?: Types.ObjectId // Factura Storno care a generat-o
  relatedDeliveryNoteId?: Types.ObjectId // Avizul original (dacă e retur manual)

  items: IReturnNoteLine[]

  // Audit
  createdBy: Types.ObjectId
  createdByName: string
  completedBy?: Types.ObjectId
  completedByName?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// --- Schemele Mongoose ---

const ReturnNoteLineSchema = new Schema<IReturnNoteLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      refPath: 'items.stockableItemType',
      required: true,
    },
    stockableItemType: {
      type: String,
      enum: ['ERPProduct', 'Packaging'],
      required: true,
    },
    productName: { type: String, required: true },
    productCode: { type: String },

    quantity: { type: Number, required: true },
    unitOfMeasure: { type: String, required: true },
    baseUnit: { type: String, required: true },
    quantityInBaseUnit: { type: Number, required: true },

    costBreakdown: { type: [CostBreakdownBatchSchema], required: true },
    unitCost: { type: Number, required: true }, // Costul mediu al ieșirii

    sourceInvoiceLineId: { type: Schema.Types.ObjectId, ref: 'Invoice.items' },
    sourceDeliveryNoteLineId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryNote.items',
    },
  },
  { _id: true } // Vrem ID-uri pe linii
)

const ReturnNoteSchema = new Schema<IReturnNoteDoc>(
  {
    seriesName: { type: String, required: true },
    sequenceNumber: { type: Number, required: true },
    returnNoteNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    returnNoteDate: { type: Date, required: true, default: Date.now },

    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    deliveryAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryAddress',
      required: true,
    },

    status: {
      type: String,
      enum: RETURN_NOTE_STATUSES,
      default: 'DRAFT',
      index: true,
    },
    reason: { type: String, enum: RETURN_NOTE_REASONS, required: true },

    notes: { type: String },

    relatedInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    relatedDeliveryNoteId: { type: Schema.Types.ObjectId, ref: 'DeliveryNote' },

    items: [ReturnNoteLineSchema],

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedByName: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
)

ReturnNoteSchema.index(
  { seriesName: 1, sequenceNumber: 1, year: 1 },
  { unique: true }
)

const ReturnNoteModel: Model<IReturnNoteDoc> =
  (models.ReturnNote as Model<IReturnNoteDoc>) ||
  model<IReturnNoteDoc>('ReturnNote', ReturnNoteSchema)

export default ReturnNoteModel
