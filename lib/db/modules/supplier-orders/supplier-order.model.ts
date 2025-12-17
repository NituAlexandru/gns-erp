import { Schema, model, models, Model } from 'mongoose'
import {
  ISupplierOrderDoc,
  IOrderTransportDetails,
  ISupplierOrderItem,
} from './supplier-order.types'
import { SUPPLIER_ORDER_STATUSES } from './supplier-order.constants'
import { INVENTORY_LOCATIONS } from '../inventory/constants'

// --- Helper Schemas ---

const tertiaryTransporterSchema = new Schema(
  {
    name: { type: String },
    cui: { type: String },
    regCom: { type: String },
    address: { type: String },
  },
  { _id: false }
)

const orderTransportSchema = new Schema<IOrderTransportDetails>(
  {
    transportType: {
      type: String,
      enum: ['INTERN', 'EXTERN_FURNIZOR', 'TERT'],
      required: true,
      default: 'INTERN',
    },
    transportCost: { type: Number, default: 0 },
    estimatedTransportCount: { type: Number, default: 1 },
    totalTransportCost: { type: Number, default: 0 },
    transportVatRate: { type: Number, default: 0 },
    transportVatValue: { type: Number, default: 0 },
    transportTotalWithVat: { type: Number, default: 0 },
    distanceInKm: { type: Number },
    travelTimeInMinutes: { type: Number },
    tertiaryTransporterDetails: { type: tertiaryTransporterSchema },
    driverName: { type: String },
    carNumber: { type: String },
    notes: { type: String },
  },
  { _id: false }
)

// CORECTIE: Structura detaliată pentru adresă în Snapshot
const supplierSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    cui: { type: String },
    regCom: { type: String },
    address: {
      judet: String,
      localitate: String,
      strada: String,
      numar: String,
      codPostal: String,
      alteDetalii: String,
    },
    iban: String,
    bank: String,
    contactName: String,
    phone: String,
  },
  { _id: false }
)

// Schema Produse
const orderItemSchema = new Schema<ISupplierOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'ERPProduct', required: true },
    productName: { type: String, required: true },
    productCode: { type: String },
    // Valori normalizate (Bază)
    quantityOrdered: { type: Number, required: true },
    quantityReceived: { type: Number, default: 0 },
    unitMeasure: { type: String, required: true },
    pricePerUnit: { type: Number, required: true }, // Preț per bucată
    // Valori UI (Originale)
    originalQuantity: { type: Number }, // ex: 10
    originalUnitMeasure: { type: String }, // ex: "palet"
    originalPricePerUnit: { type: Number }, // ex: 1500
    vatRate: { type: Number, default: 0 },
    vatValue: { type: Number },
    lineTotal: { type: Number },
  },
  { _id: false }
)

// Schema Ambalaje (NOU)
const orderPackagingSchema = new Schema(
  {
    packaging: {
      type: Schema.Types.ObjectId,
      ref: 'Packaging',
      required: true,
    },
    packagingName: { type: String, required: true },
    productCode: { type: String },
    quantityOrdered: { type: Number, required: true, min: 0 },
    quantityReceived: { type: Number, required: true, default: 0, min: 0 },
    unitMeasure: { type: String, required: true },
    unitMeasureCode: { type: String },
    pricePerUnit: { type: Number, required: true, default: 0 },
    originalQuantity: { type: Number }, // ex: 10
    originalUnitMeasure: { type: String }, // ex: "palet"
    originalPricePerUnit: { type: Number }, // ex: 120
    lineTotal: { type: Number, required: true, default: 0 },
    vatRate: { type: Number, required: true, default: 0 },
    vatValue: { type: Number, required: true, default: 0 },
  },
  { _id: false }
)

const linkedReceptionSchema = new Schema(
  {
    receptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Reception',
      required: true,
    },
    receptionNumber: { type: String, required: true },
    receptionDate: { type: Date, required: true },
    totalValue: { type: Number, default: 0 },
  },
  { _id: false }
)

// --- Main Schema ---
const supplierOrderSchema = new Schema<ISupplierOrderDoc>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    supplierOrderNumber: { type: String, required: false },
    supplierOrderDate: { type: Date, required: false },
    orderDate: { type: Date, required: true, default: Date.now },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierSnapshot: { type: supplierSnapshotSchema, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },

    destinationType: {
      type: String,
      enum: ['DEPOZIT', 'PROIECT'],
      required: true,
      default: 'DEPOZIT',
    },
    // REFOLOSIM LOCAȚIILE DIN INVENTORY
    destinationLocation: {
      type: String,
      enum: INVENTORY_LOCATIONS,
      required: true,
      default: 'DEPOZIT',
    },
    destinationId: { type: Schema.Types.ObjectId, ref: 'Project' },
    transportDetails: { type: orderTransportSchema, required: true },
    products: [orderItemSchema],
    packagingItems: [orderPackagingSchema],
    receptions: { type: [linkedReceptionSchema], default: [] },
    currency: {
      type: String,
      enum: ['RON', 'EUR', 'USD'],
      default: 'RON',
      required: true,
    },
    exchangeRate: { type: Number, default: 1 },

    totalValue: { type: Number, default: 0 },
    totalVat: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    status: {
      type: String,
      enum: SUPPLIER_ORDER_STATUSES,
      default: 'DRAFT',
      index: true,
    },
    notes: { type: String },
  },
  { timestamps: true }
)

const SupplierOrderModel: Model<ISupplierOrderDoc> =
  (models.SupplierOrder as Model<ISupplierOrderDoc>) ||
  model<ISupplierOrderDoc>('SupplierOrder', supplierOrderSchema)

export default SupplierOrderModel
