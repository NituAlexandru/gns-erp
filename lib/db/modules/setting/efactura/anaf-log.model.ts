import mongoose, { Schema, Model } from 'mongoose'
import { IAnafLog } from './anaf.types'
import { ANAF_LOG_TYPES } from './anaf.constants'

const AnafLogSchema: Schema = new Schema(
  {
    type: { type: String, enum: ANAF_LOG_TYPES, required: true },
    action: { type: String, required: true },
    message: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const AnafLog: Model<IAnafLog> =
  mongoose.models.AnafLog || mongoose.model<IAnafLog>('AnafLog', AnafLogSchema)

export default AnafLog
