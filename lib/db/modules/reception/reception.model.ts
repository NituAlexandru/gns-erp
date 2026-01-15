import { Document, Model, models, model, Schema, Types } from 'mongoose'

export interface ITertiaryTransporter {
  name: string
  cui?: string
  regCom?: string
  address?: string
}
export interface ISupplierSnapshot {
  name: string
  cui?: string
  regCom?: string
  address?: {
    judet: string
    localitate: string
    strada: string
    numar: string
    codPostal: string
    alteDetalii?: string
  }
  iban?: string
  bank?: string
}

export interface IDelivery {
  dispatchNoteSeries?: string
  dispatchNoteNumber: string
  dispatchNoteDate: Date
  driverName?: string
  carNumber?: string
  notes?: string
  transportType: 'INTERN' | 'EXTERN_FURNIZOR' | 'TERT'
  transportCost: number
  transportVatRate?: number // Ex: 21
  transportVatValue?: number // Valoarea calculată
  tertiaryTransporterDetails?: ITertiaryTransporter
}

export interface IInvoice {
  series?: string
  number: string
  date: Date
  dueDate?: Date
  currency: 'RON' | 'EUR' | 'USD'
  amount: number
  vatRate: number
  vatValue?: number
  totalWithVat?: number
  exchangeRateOnIssueDate?: number
}

// --- Structura pentru costurile unui articol ---
export interface IReceptionItemCost {
  invoicePricePerUnit: number // Prețul de pe factură (fără transport) - pentru contabilitate/NIR
  distributedTransportCostPerUnit: number // Cota de transport alocată per unitatea de BAZĂ
  totalDistributedTransportCost: number // Costul TOTAL de transport alocat întregii cantități de pe această linie
  landedCostPerUnit: number // Costul final "de business" per unitatea de BAZĂ (invoicePrice + transportCost)
  vatRate: number //  Cota de TVA a articolului
  vatValuePerUnit: number //  Valoarea TVA per unitate de bază
}

export interface IQualityDetails {
  lotNumbers?: string[]
  certificateNumbers?: string[]
  testReports?: string[]
  additionalNotes?: string
}

export interface IReceptionDoc extends Document {
  _id: Types.ObjectId
  createdBy: Types.ObjectId
  createdByName: string
  supplier: Types.ObjectId
  supplierSnapshot: ISupplierSnapshot
  destinationType: 'DEPOZIT' | 'PROIECT'
  destinationId?: Types.ObjectId
  // TODO (Proiecte): Refactorizează logica de destinație.
  // Viitorul model ar trebui să permită ca un Proiect (destinationId)
  // să aibă propria sa sub-locație (destinationLocation).
  // De exemplu: destinationId: 'ID_PROIECT_1', destinationLocation: 'DEPOZIT_PROIECT'.
  // Câmpul `location` din modelul de Inventar va trebui să stocheze
  // acest identificator compozit sau să aibă câmpuri separate.
  destinationLocation: string
  orderRef?: Types.ObjectId
  products: ({
    _id: Types.ObjectId
    product: Types.ObjectId
    productName: string
    productCode?: string
    quantity: number
    documentQuantity?: number
    unitMeasure: string
    unitMeasureCode?: string
    originalQuantity?: number
    originalUnitMeasure?: string
    originalInvoicePricePerUnit?: number
    qualityDetails?: IQualityDetails
    originalDocumentQuantity?: number
  } & IReceptionItemCost)[]
  packagingItems: ({
    _id: Types.ObjectId
    packaging: Types.ObjectId
    packagingName: string
    productCode?: string
    quantity: number
    documentQuantity?: number
    unitMeasure: string
    unitMeasureCode?: string
    originalQuantity?: number
    originalDocumentQuantity?: number
    originalUnitMeasure?: string
    originalInvoicePricePerUnit?: number
    qualityDetails?: IQualityDetails
  } & IReceptionItemCost)[]
  receptionDate: Date
  status: 'DRAFT' | 'CONFIRMAT'
  deliveries: IDelivery[]
  invoices: IInvoice[]
  nirNumber?: string
  nirDate?: Date
  nirId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// --- Scheme pentru Sub-documente ---

const tertiaryTransporterSchema = new Schema<ITertiaryTransporter>(
  {
    name: { type: String, required: false },
    cui: { type: String },
    regCom: { type: String },
    address: { type: String },
  },
  { _id: false }
)

const deliverySchema = new Schema<IDelivery>(
  {
    dispatchNoteSeries: { type: String, required: false },
    dispatchNoteNumber: { type: String, required: true },
    dispatchNoteDate: { type: Date, required: true },
    driverName: { type: String, required: false },
    carNumber: { type: String, required: false },
    notes: { type: String, required: false },
    transportType: {
      type: String,
      enum: ['INTERN', 'EXTERN_FURNIZOR', 'TERT'],
      required: true,
    },
    transportCost: { type: Number, default: 0, required: true },
    transportVatRate: { type: Number, default: 0 },
    transportVatValue: { type: Number, default: 0 },
    tertiaryTransporterDetails: {
      type: tertiaryTransporterSchema,
      required: false,
    },
  },
  { _id: false }
)

const invoiceSchema = new Schema<IInvoice>(
  {
    series: { type: String, required: false },
    number: { type: String, required: true },
    date: { type: Date, required: true },
    dueDate: { type: Date, required: false },
    currency: {
      type: String,
      enum: ['RON', 'EUR', 'USD'],
      required: true,
      default: 'RON',
    },
    amount: { type: Number, required: false },
    vatRate: { type: Number, required: true, default: 0 },
    vatValue: { type: Number, required: true, default: 0 },
    totalWithVat: { type: Number, required: true, default: 0 },
    exchangeRateOnIssueDate: { type: Number, required: false },
  },
  { _id: false }
)

const receptionItemCostSchema = {
  invoicePricePerUnit: { type: Number, required: false, default: null },
  distributedTransportCostPerUnit: { type: Number, default: 0 },
  totalDistributedTransportCost: { type: Number, default: 0 },
  landedCostPerUnit: { type: Number, required: false },
  vatRate: { type: Number, required: true, default: 0 },
  vatValuePerUnit: { type: Number, required: true, default: 0 },
}

const supplierSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    cui: { type: String },
  },
  { _id: false }
)

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
    createdByName: { type: String, required: true },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierSnapshot: { type: supplierSnapshotSchema, required: true },
    orderRef: {
      type: Schema.Types.ObjectId,
      ref: 'SupplierOrder',
      required: false,
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
        productName: { type: String, required: true },
        productCode: { type: String },
        documentQuantity: { type: Number, required: false },
        quantity: { type: Number, required: true },
        unitMeasure: { type: String, required: true },
        unitMeasureCode: { type: String, required: false },
        originalQuantity: { type: Number, required: false },
        originalUnitMeasure: { type: String, required: false },
        originalInvoicePricePerUnit: { type: Number, required: false },
        originalDocumentQuantity: { type: Number, required: false },
        qualityDetails: { type: QualityDetailsSchema, required: false },
        ...receptionItemCostSchema,
      },
    ],
    packagingItems: [
      {
        _id: false,
        packaging: { type: Schema.Types.ObjectId, ref: 'Packaging' },
        packagingName: { type: String, required: true },
        productCode: { type: String },
        documentQuantity: { type: Number, required: false },
        quantity: { type: Number, required: true },
        unitMeasure: { type: String, required: true },
        unitMeasureCode: { type: String, required: false },
        originalQuantity: { type: Number, required: false },
        originalUnitMeasure: { type: String, required: false },
        originalInvoicePricePerUnit: { type: Number, required: false },
        originalDocumentQuantity: { type: Number, required: false },
        qualityDetails: { type: QualityDetailsSchema, required: false },
        ...receptionItemCostSchema,
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
    nirNumber: { type: String },
    nirDate: { type: Date },
    nirId: { type: Schema.Types.ObjectId, ref: 'Nir' },
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
