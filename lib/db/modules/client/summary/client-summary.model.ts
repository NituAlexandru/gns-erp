import mongoose, { Document, Schema } from 'mongoose'

// Interfața TypeScript pentru a beneficia de type-checking
export interface IClientSummary extends Document {
  clientId: mongoose.Schema.Types.ObjectId
  outstandingBalance: number
  overdueBalance: number
  creditLimit: number
  availableCredit: number
  isBlocked: boolean
  returnablePackaging: Map<string, number>
  totalSalesValue: number
  lastOrderDate?: Date
}

const ClientSummarySchema = new Schema<IClientSummary>(
  {
    // Legătura unică către clientul din colecția 'clients'
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      unique: true,
      index: true,
    },
    // Soldul total restant (facturi neîncasate)
    outstandingBalance: { type: Number, default: 0 },
    // Din soldul total, cât are scadența depășită
    overdueBalance: { type: Number, default: 0 },
    // Plafonul de credit negociat
    creditLimit: { type: Number, default: 0 },
    // Câmp calculat: Plafon - Sold
    availableCredit: { type: Number, default: 0 },
    // Statusul de blocare (ex: dacă a depășit plafonul sau scadența)
    isBlocked: { type: Boolean, default: false },
    // O mapă pentru a stoca ambalaje de returnat, ex: { 'paleti': 10, 'butelii': 5 }
    returnablePackaging: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Valoarea totală a vânzărilor către acest client (lifetime)
    totalSalesValue: { type: Number, default: 0 },
    // Data ultimei comenzi plasate
    lastOrderDate: { type: Date },
  },
  {
    timestamps: true, // Adaugă automat createdAt și updatedAt
  }
)

const ClientSummary =
  mongoose.models.ClientSummary ||
  mongoose.model<IClientSummary>('ClientSummary', ClientSummarySchema)

export default ClientSummary
