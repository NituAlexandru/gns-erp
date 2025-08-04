import { Document, Model, models, model, Schema, Types } from 'mongoose'

export interface IDelivery {
  dispatchNoteSeries?: string
  dispatchNoteNumber: string
  dispatchNoteDate: Date
  driverName?: string
  carNumber?: string
  notes?: string
}

export interface IInvoice {
  series?: string
  number: string
  date: Date
  amount: number
}

export interface IReceptionDoc extends Document {
  _id: Types.ObjectId
  createdBy: Types.ObjectId
  supplier: Types.ObjectId
  destinationType: 'DEPOZIT' | 'PROIECT'
  destinationId?: Types.ObjectId
  // TODO (Proiecte): Refactorizează logica de destinație.
  // Viitorul model ar trebui să permită ca un Proiect (destinationId)
  // să aibă propria sa sub-locație (destinationLocation).
  // De exemplu: destinationId: 'ID_PROIECT_1', destinationLocation: 'DEPOZIT_PROIECT'.
  // Câmpul `location` din modelul de Inventar va trebui să stocheze
  // acest identificator compozit sau să aibă câmpuri separate.
  destinationLocation: string
  products: {
    product: Types.ObjectId
    quantity: number
    unitMeasure: string
    priceAtReception?: number | null
  }[]
  packagingItems: {
    packaging: Types.ObjectId
    quantity: number
    unitMeasure: string
    priceAtReception?: number | null
  }[]
  receptionDate: Date
  status: 'DRAFT' | 'CONFIRMAT'
  deliveries: IDelivery[]
  invoices: IInvoice[]
  createdAt: Date
  updatedAt: Date
}

// --- Scheme pentru Sub-documente ---
const deliverySchema = new Schema<IDelivery>(
  {
    dispatchNoteSeries: { type: String, required: false },
    dispatchNoteNumber: { type: String, required: true },
    dispatchNoteDate: { type: Date, required: true },
    driverName: { type: String, required: false },
    carNumber: { type: String, required: false },
    notes: { type: String, required: false },
  },
  { _id: false }
)

const invoiceSchema = new Schema<IInvoice>(
  {
    series: { type: String, required: false },
    number: { type: String, required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
)

// --- Schema Principală ---
const receptionSchema = new Schema<IReceptionDoc>(
  {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    destinationType: {
      type: String,
      enum: ['DEPOZIT', 'PROIECT'],
      required: true,
      default: 'DEPOZIT',
    },
    destinationId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: false,
    },
    destinationLocation: { type: String, required: true, default: 'DEPOZIT' },
    products: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: 'ERPProduct' },
        quantity: { type: Number, required: true },
        unitMeasure: { type: String, required: true },
        priceAtReception: { type: Number, default: null, required: false },
      },
    ],
    packagingItems: [
      {
        _id: false,
        packaging: { type: Schema.Types.ObjectId, ref: 'Packaging' },
        quantity: { type: Number, required: true },
        unitMeasure: { type: String, required: true },
        priceAtReception: { type: Number, default: null, required: false },
      },
    ],
    receptionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      default: 'DRAFT',
      enum: ['DRAFT', 'CONFIRMAT'],
    },
    deliveries: [deliverySchema],
    invoices: [invoiceSchema],
  },
  { timestamps: true }
)

receptionSchema.index({ createdBy: 1 })
receptionSchema.index({ supplier: 1 })
receptionSchema.index({ receptionDate: -1 })
receptionSchema.index({ status: 1 })

const ReceptionModel: Model<IReceptionDoc> =
  (models.Reception as Model<IReceptionDoc>) ||
  model<IReceptionDoc>('Reception', receptionSchema)

export default ReceptionModel
