import mongoose, { Schema, Model } from 'mongoose'
import { IAnafToken } from './anaf.types'

const AnafTokenSchema: Schema = new Schema<IAnafToken>(
  {
    iv: { type: String, required: true },
    encryptedAccessToken: { type: String, required: true },
    encryptedRefreshToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    refreshTokenExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

// Prevenire recompilare model în development
const AnafToken: Model<IAnafToken> =
  mongoose.models.AnafToken ||
  mongoose.model<IAnafToken>('AnafToken', AnafTokenSchema)

export default AnafToken
