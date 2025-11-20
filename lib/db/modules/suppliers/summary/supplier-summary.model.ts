import mongoose, { Document, Schema } from 'mongoose'

// Interfața TypeScript
export interface ISupplierSummary extends Document {
  supplierId: mongoose.Schema.Types.ObjectId
  outstandingBalance: number
  overdueBalance: number
  overdueInvoicesCount: number
  totalPurchaseValue: number
  returnablePackaging: Map<string, number>
  lastPurchaseOrderDate?: Date
}

const SupplierSummarySchema = new Schema<ISupplierSummary>(
  {
    // Legătura unică către furnizorul din colecția 'suppliers'
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      unique: true,
      index: true,
    },
    // Soldul pe care îl datorăm furnizorului (facturi neplătite)
    outstandingBalance: { type: Number, default: 0 },

    overdueBalance: { type: Number, default: 0 },
    overdueInvoicesCount: { type: Number, default: 0 },
    // Valoarea totală a achizițiilor de la acest furnizor
    totalPurchaseValue: { type: Number, default: 0 },
    // Ambalaje de returnat către furnizor
    returnablePackaging: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Data ultimei comenzi de cumpărare
    lastPurchaseOrderDate: { type: Date },
  },
  {
    timestamps: true,
  }
)

const SupplierSummary =
  mongoose.models.SupplierSummary ||
  mongoose.model<ISupplierSummary>('SupplierSummary', SupplierSummarySchema)

export default SupplierSummary
