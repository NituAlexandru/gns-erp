import mongoose, { Schema, Model, Document } from 'mongoose'
import { IContractParagraph } from './contract.types'

export interface IContractTemplate extends Document {
  name: string
  documentTitle: string
  type: 'CONTRACT' | 'ADDENDUM'
  isDefault: boolean
  paragraphs: IContractParagraph[]
  createdAt: Date
  updatedAt: Date
}

const ParagraphSchema = new Schema<IContractParagraph>({
  id: { type: String, required: true },
  title: { type: String },
  content: { type: String, required: true },
  order: { type: Number, required: true },
})

const ContractTemplateSchema = new Schema<IContractTemplate>(
  {
    name: { type: String, required: true },
    documentTitle: { type: String, default: 'CONTRACT' },
    type: { type: String, enum: ['CONTRACT', 'ADDENDUM'], required: true },
    isDefault: { type: Boolean, default: false },
    paragraphs: { type: [ParagraphSchema], default: [] },
  },
  { timestamps: true },
)

const ContractTemplate: Model<IContractTemplate> =
  mongoose.models.ContractTemplate ||
  mongoose.model<IContractTemplate>('ContractTemplate', ContractTemplateSchema)

export default ContractTemplate
