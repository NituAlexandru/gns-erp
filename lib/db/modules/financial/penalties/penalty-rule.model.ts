import mongoose, { Schema, models, Model, Document } from 'mongoose'

export interface IPenaltyRule extends Document {
  name: string
  percentagePerDay: number // ex: 0.01 (pentru 0.01%)
  autoBillDays: number // ex: 5 (se emite la 5 zile)
  isDefault: boolean // Marchează dacă este regula globală
  clientIds: mongoose.Types.ObjectId[] // Clienții asignați acestei liste
  updatedBy: mongoose.Types.ObjectId
  updatedByName: string
  createdAt: Date
  updatedAt: Date
}

const PenaltyRuleSchema = new Schema<IPenaltyRule>(
  {
    name: { type: String, required: true },
    percentagePerDay: { type: Number, required: true },
    autoBillDays: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
    clientIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Client',
      },
    ],
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedByName: { type: String, required: true },
  },
  { timestamps: true },
)

const PenaltyRuleModel =
  (models.PenaltyRule as Model<IPenaltyRule>) ||
  mongoose.model<IPenaltyRule>('PenaltyRule', PenaltyRuleSchema)

export default PenaltyRuleModel
