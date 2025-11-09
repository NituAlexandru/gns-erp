import mongoose, { Schema, models, Model } from 'mongoose'
import { IBudgetCategoryDoc } from './budget-category.types'

// --- Schema Mongoose ---
const BudgetCategorySchema = new Schema<IBudgetCategoryDoc>(
  {
    name: { type: String, required: true },
    description: { type: String },

    // Relația Părinte-Copil
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'BudgetCategory', // Referință la sine (aceeași colecție)
      default: null, // 'null' înseamnă că este o categorie principală
      index: true,
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

// Index pentru a asigura că numele sunt unice la același nivel (în cadrul aceluiași părinte)
// Un 'parentId' null este tratat ca o valoare unică
BudgetCategorySchema.index({ name: 1, parentId: 1 }, { unique: true })

const BudgetCategoryModel =
  (models.BudgetCategory as Model<IBudgetCategoryDoc>) ||
  mongoose.model<IBudgetCategoryDoc>('BudgetCategory', BudgetCategorySchema)

export default BudgetCategoryModel
