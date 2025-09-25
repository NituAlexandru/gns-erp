import mongoose, { Schema, Document, models } from 'mongoose'

export interface ISeries extends Document {
  name: string // Ex: "FACT", "AVZ", "GNS"
  documentType: DocumentType
  isActive: boolean
}

const SeriesSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // Force uppercase for consistency
    },
    documentType: {
      type: String,
      enum: [
        'Aviz',
        'Proforma',
        'Factura',
        'FacturaStorno',
        'NIR',
        'Chitanta',
        'BonConsum',
        'DispozitiePlata',
      ],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

SeriesSchema.index({ name: 1, documentType: 1 }, { unique: true })

const Series = models.Series || mongoose.model<ISeries>('Series', SeriesSchema)

export default Series
