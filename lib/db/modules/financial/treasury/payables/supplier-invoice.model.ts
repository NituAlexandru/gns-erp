
import mongoose, { Schema, models, Model } from 'mongoose'
import {
  ISupplierInvoiceDoc,
  SupplierInvoiceLine,
  SupplierInvoiceTotals,
  SupplierSnapshot,
  OurCompanySnapshot, 
} from './supplier-invoice.types'
import { SUPPLIER_INVOICE_STATUSES } from './supplier-invoice.constants'

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

const CompanySnapshotSubSchema = new Schema<OurCompanySnapshot>(
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

const SupplierSnapshotSubSchema = new Schema<SupplierSnapshot>(
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

const SupplierInvoiceLineSubSchema = new Schema<SupplierInvoiceLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'ERPProduct' },
    productName: { type: String, required: true },
    productCode: { type: String },
    quantity: { type: Number, required: true },
    unitOfMeasure: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    lineValue: { type: Number, required: true },
    vatRateDetails: {
      rate: { type: Number, required: true },
      value: { type: Number, required: true },
    },
    lineTotal: { type: Number, required: true },
  },
  { _id: true }
)

const SupplierInvoiceTotalsSubSchema = new Schema<SupplierInvoiceTotals>(
  {
    productsSubtotal: { type: Number, default: 0 },
    productsVat: { type: Number, default: 0 },
    packagingSubtotal: { type: Number, default: 0 },
    packagingVat: { type: Number, default: 0 },
    servicesSubtotal: { type: Number, default: 0 },
    servicesVat: { type: Number, default: 0 },
    manualSubtotal: { type: Number, default: 0 },
    manualVat: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    vatTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
  },
  { _id: false }
)

const SupplierInvoiceSchema = new Schema<ISupplierInvoiceDoc>(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    supplierSnapshot: { type: SupplierSnapshotSubSchema, required: true },
    ourCompanySnapshot: { type: CompanySnapshotSubSchema, required: true }, // <-- Acum folosește schema locală
    invoiceSeries: { type: String, required: true },
    invoiceNumber: { type: String, required: true, index: true },
    invoiceDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true },

    items: [SupplierInvoiceLineSubSchema],
    totals: { type: SupplierInvoiceTotalsSubSchema, required: true },

    status: {
      type: String,
      enum: SUPPLIER_INVOICE_STATUSES,
      default: 'NEPLATITA',
      required: true,
      index: true,
    },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },

    eFacturaXMLId: { type: String, index: true, sparse: true },
    eFacturaIndex: { type: String, index: true, sparse: true },

    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

// Hook pentru a seta 'remainingAmount' la creare
SupplierInvoiceSchema.pre('save', function (this: ISupplierInvoiceDoc, next) {
  if (this.isNew) {
    this.paidAmount = 0
    this.remainingAmount = this.totals.grandTotal
  }
  next()
})

const SupplierInvoiceModel =
  (models.SupplierInvoice as Model<ISupplierInvoiceDoc>) ||
  mongoose.model<ISupplierInvoiceDoc>('SupplierInvoice', SupplierInvoiceSchema)

export default SupplierInvoiceModel
