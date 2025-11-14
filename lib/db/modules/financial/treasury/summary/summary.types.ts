import { Types } from 'mongoose'

// Tipul pentru datele STATICE 
export type TreasuryStaticStats = {
  totalDeIncasat: number
  totalDePlatit: number
}

// Tipul pentru Încasările agregate 
export type ClientPaymentSummaryItem = {
  _id: Types.ObjectId
  clientName: string
  totalIncasat: number
}
export type ClientPaymentSummary = {
  totalIncasatPerioada: number
  summaryList: ClientPaymentSummaryItem[]
}

// Tipul pentru Plățile agregate
export type BudgetPaymentSummaryItem = {
  _id: string
  mainTotal: number
  subcategories: {
    name: string
    total: number
  }[]
}
export type BudgetPaymentSummary = {
  totalPlatiPerioada: number
  summaryList: BudgetPaymentSummaryItem[]
}

// Detaliul pentru o singură factură restantă
export type OverdueInvoiceDetail = {
  _id: Types.ObjectId
  seriesName: string
  invoiceNumber: string
  dueDate: Date
  remainingAmount: number
  daysOverdue: number 
}

// Structura pentru un client (capul de acordeon)
export type OverdueClientSummary = {
  _id: Types.ObjectId // Client ID
  clientName: string
  totalOverdue: number // Suma totală restantă a clientului
  overdueInvoices: OverdueInvoiceDetail[] // Lista de facturi
}
