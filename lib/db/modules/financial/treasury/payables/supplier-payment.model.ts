import mongoose, { Schema, models, Model } from 'mongoose'
import { ISupplierPaymentDoc } from './supplier-payment.types'
import { SUPPLIER_PAYMENT_STATUSES } from './supplier-payment.constants'
import { PAYMENT_METHODS } from '../payment.constants'
import { round2 } from '@/lib/utils'

// --- Definim sub-schema pentru snapshot ---
const BudgetCategorySnapshotSchema = new Schema(
  {
    mainCategoryId: { type: Schema.Types.ObjectId, required: true },
    mainCategoryName: { type: String, required: true },
    subCategoryId: { type: Schema.Types.ObjectId },
    subCategoryName: { type: String },
  },
  { _id: false }
)

const SupplierPaymentSchema = new Schema<ISupplierPaymentDoc>(
  {
    paymentNumber: { type: String, required: true, index: true },
    seriesName: { type: String, default: null },
    sequenceNumber: { type: Number, default: null },

    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    totalAmount: { type: Number, required: true },
    unallocatedAmount: { type: Number, required: true },
    referenceDocument: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },
    notes: { type: String },
    status: {
      type: String,
      enum: SUPPLIER_PAYMENT_STATUSES,
      default: 'NEALOCATA',
      required: true,
    },
    // ---Adăugăm câmpul în schema principală ---
    budgetCategorySnapshot: {
      type: BudgetCategorySnapshotSchema,
      required: false,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

// Hook-ul 'pre save' ( setează status și unallocated)
SupplierPaymentSchema.pre('save', function (this: ISupplierPaymentDoc, next) {
  // 1.Dacă statusul este deja ANULATA, IEȘIM imediat.
  if (this.status === 'ANULATA') {
    return next()
  }

  // 2. Logica de bază (pentru NEALOCATA, PARTIAL_ALOCATA, ALOCATA)
  if (this.isNew) {
    this.unallocatedAmount = this.totalAmount
  }

  const unallocated = round2(this.unallocatedAmount)
  const total = round2(this.totalAmount)

  if (unallocated <= 0) {
    this.status = 'ALOCATA'
    this.unallocatedAmount = 0
  } else if (unallocated >= total) {
    this.status = 'NEALOCATA'
  } else {
    this.status = 'PARTIAL_ALOCATA'
  }

  next()
})

const SupplierPaymentModel =
  (models.SupplierPayment as Model<ISupplierPaymentDoc>) ||
  mongoose.model<ISupplierPaymentDoc>('SupplierPayment', SupplierPaymentSchema)

export default SupplierPaymentModel
