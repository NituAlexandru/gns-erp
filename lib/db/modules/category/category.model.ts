import { Document, Model, model, models, Schema, Types } from 'mongoose'
import { ICategoryInput } from './validator'


// Documentul complet (inclusiv _id și timestamps)
export interface ICategoryDoc extends Document, ICategoryInput {
  _id: string
  createdAt: Date
  updatedAt: Date
}

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    mainCategory: {
      type: Types.ObjectId,
      ref: 'Category',
      required: false,
    },
  },
  {
    timestamps: true,
  }
)

// indexuri pentru căutări rapide
categorySchema.index({ name: 1 })
categorySchema.index({ slug: 1 }, { unique: true })
categorySchema.index({ mainCategory: 1 })

const CategoryModel: Model<ICategoryDoc> =
  (models.Category as Model<ICategoryDoc>) ||
  model<ICategoryDoc>('Category', categorySchema)

export default CategoryModel
