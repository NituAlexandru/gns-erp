import mongoose, { Document, Schema } from 'mongoose'
import { IClientDoc } from '../types'

// Interfața TypeScript pentru a beneficia de type-checking
export interface IClientSummary extends Document {
  clientId: mongoose.Schema.Types.ObjectId
  // Soldul Operațional (Wallet-ul): Folosit pentru decizii de livrare
  // (Avansul neplătit nu apare aici, Plata avansului scade soldul)
  outstandingBalance: number
  // Soldul Contabil (Fiscal): Adevărul pentru contabilitate
  // (Include toate facturile emise minus plăți)
  accountingBalance: number
  overdueBalance: number
  overdueInvoicesCount: number
  creditLimit: number
  availableCredit: number
  isBlocked: boolean
  returnablePackaging: Map<string, number>
  totalSalesValue: number
  lastOrderDate?: Date
}
export type ClientWithSummary = IClientDoc & {
  summary?: IClientSummary | null
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
    accountingBalance: { type: Number, default: 0 },
    // Din soldul total, cât are scadența depășită
    overdueBalance: { type: Number, default: 0 },
    overdueInvoicesCount: { type: Number, default: 0 },
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
