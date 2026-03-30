import mongoose, { Schema, models, Model, Document } from 'mongoose'

export interface IPenaltyRecord extends Document {
  invoiceId: mongoose.Types.ObjectId // Factura originală restantă
  clientId: mongoose.Types.ObjectId
  periodEnd: Date // Data până la care s-au facturat penalitățile (inclusiv)
  amountCalculated: number // Valoarea penalității la acel moment
  penaltyInvoiceId?: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  createdByName: string
  createdAt: Date
}
//
const PenaltyRecordSchema = new Schema<IPenaltyRecord>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    periodEnd: { type: Date, required: true },
    amountCalculated: { type: Number, required: true },
    penaltyInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: false,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true },
)

// Index compus pentru a găsi rapid istoricul unei facturi
PenaltyRecordSchema.index({ invoiceId: 1, periodEnd: -1 })

const PenaltyRecordModel =
  (models.PenaltyRecord as Model<IPenaltyRecord>) ||
  mongoose.model<IPenaltyRecord>('PenaltyRecord', PenaltyRecordSchema)

export default PenaltyRecordModel
