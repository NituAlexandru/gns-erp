import mongoose, { Schema, Document, models } from 'mongoose'

export type DocumentType =
  | 'Aviz'
  | 'Proforma'
  | 'Factura'
  | 'FacturaStorno'
  | 'NIR'
  | 'BonConsum'
  | 'DispozitiePlata'
  | 'NotaRetur'
  | 'Chitanta'

export interface IDocumentCounter extends Document {
  seriesName: string
  year: number
  currentNumber: number
}

const DocumentCounterSchema: Schema = new Schema({
  seriesName: {
    type: String,
    required: true,
    uppercase: true,
  },
  year: {
    type: Number,
    required: true,
  },
  currentNumber: {
    type: Number,
    required: true,
    default: 0, // Starts at 0, so the first generated number will be 1
  },
})

// The key to the system: a counter is unique for a SERIES and a YEAR.
DocumentCounterSchema.index({ seriesName: 1, year: 1 }, { unique: true })

const DocumentCounter =
  models.DocumentCounter ||
  mongoose.model<IDocumentCounter>('DocumentCounter', DocumentCounterSchema)

export default DocumentCounter
