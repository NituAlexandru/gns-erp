import mongoose, { Schema, Model } from 'mongoose'
import { IEfacturaOutgoing } from './outgoing.types'

const EfacturaOutgoingSchema: Schema = new Schema<IEfacturaOutgoing>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    invoiceNumber: { type: String, required: true },

    currentStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },

    history: [
      {
        date: { type: Date, default: Date.now },
        status: { type: String, required: true },
        uploadIndex: { type: String },
        xmlContent: { type: String }, // Stocăm XML-ul pentru debug
        anafMessages: [{ type: String }],
        downloadId: { type: String },
      },
    ],
  },
  { timestamps: true }
)

const EfacturaOutgoing: Model<IEfacturaOutgoing> =
  mongoose.models.EfacturaOutgoing ||
  mongoose.model<IEfacturaOutgoing>('EfacturaOutgoing', EfacturaOutgoingSchema)

export default EfacturaOutgoing
