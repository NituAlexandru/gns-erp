import mongoose, { Schema, Model, Document } from 'mongoose'

export interface IGeneratedContract extends Document {
  clientId: mongoose.Types.ObjectId | string
  templateId: mongoose.Types.ObjectId | string
  type: 'CONTRACT' | 'ADDENDUM'
  parentContractId?: mongoose.Types.ObjectId | string // Folosit doar pentru Acte Adiționale
  series: string
  number: string
  documentTitle: string
  date: Date
  createdBy: string // ID-ul adminului care a generat documentul
  createdAt: Date
  updatedAt: Date
}

const GeneratedContractSchema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractTemplate',
      required: true,
    },
    type: { type: String, enum: ['CONTRACT', 'ADDENDUM'], required: true },
    series: { type: String, required: true },
    number: { type: String, required: true },
    documentTitle: { type: String, required: true },
    date: { type: Date, required: true },

    // SNAPSHOTS - Aici salvăm datele ca să rămână neschimbate în timp
    clientSnapshot: { type: Object, required: true },
    companySnapshot: { type: Object, required: true },
    paragraphs: [
      {
        title: String,
        content: String,
      },
    ],

    parentContractId: { type: Schema.Types.ObjectId, ref: 'GeneratedContract' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

GeneratedContractSchema.index(
  { series: 1, number: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'CONTRACT' }, 
  },
)

const GeneratedContract: Model<IGeneratedContract> =
  mongoose.models.GeneratedContract ||
  mongoose.model<IGeneratedContract>(
    'GeneratedContract',
    GeneratedContractSchema,
  )

export default GeneratedContract
