import mongoose, { Schema, models, Model } from 'mongoose'
import { IBudgetCategoryDoc } from './budget-category.types'

// --- Schema Mongoose ---
const BudgetCategorySchema = new Schema<IBudgetCategoryDoc>(
  {
    name: { type: String, required: true },
    description: { type: String },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'BudgetCategory', 
      default: null, 
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
)

BudgetCategorySchema.index({ name: 1, parentId: 1 }, { unique: true })

const BudgetCategoryModel =
  (models.BudgetCategory as Model<IBudgetCategoryDoc>) ||
  mongoose.model<IBudgetCategoryDoc>('BudgetCategory', BudgetCategorySchema)

export default BudgetCategoryModel
