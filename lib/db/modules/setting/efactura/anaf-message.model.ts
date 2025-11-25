import mongoose, { Schema, Model } from 'mongoose'
import { IAnafMessage } from './anaf.types'
import { ANAF_PROCESSING_STATUSES } from './anaf.constants'

const AnafMessageSchema: Schema = new Schema(
  {
    id_descarcare: { type: String, required: true, unique: true, index: true },
    cui_emitent: { type: String, required: true, index: true },
    titlu: { type: String },
    tip: {
      type: String,
      enum: ['FACTURA_PRIMITA', 'FACTURA_TRIMISA', 'EROARE_FACTURA'],
      required: true,
    },
    data_creare: { type: Date, required: true },
    serial: { type: String },
    detalii: { type: String },

    is_downloaded: { type: Boolean, default: false },
    processing_status: {
      type: String,
      enum: ANAF_PROCESSING_STATUSES,
      default: 'UNPROCESSED',
    },
    processing_error: { type: String },
    related_invoice_id: { type: Schema.Types.ObjectId, ref: 'SupplierInvoice' },
  },
  { timestamps: true }
)

const AnafMessage: Model<IAnafMessage> =
  mongoose.models.AnafMessage ||
  mongoose.model<IAnafMessage>('AnafMessage', AnafMessageSchema)

export default AnafMessage
