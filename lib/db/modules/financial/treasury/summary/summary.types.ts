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
export type UnallocatedPaymentItem = {
  _id: string
  paymentNumber: string
  seriesName: string
  paymentDate: Date
  clientName: string
  unallocatedAmount: number
  totalAmount: number
}

export type ClientPaymentSummary = {
  totalIncasatPerioada: number
  totalFacturatPerioada: number
  totalNealocat: number
  summaryList: ClientPaymentSummaryItem[]
  unallocatedList: UnallocatedPaymentItem[]
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
  _id: string
  seriesName: string
  invoiceNumber: string
  dueDate: string
  remainingAmount: number
  daysOverdue: number
}

// Structura pentru un client (capul de acordeon)
export type OverdueClientSummary = {
  _id: string
  clientName: string
  totalOverdue: number // Suma totală restantă a clientului
  overdueInvoices: OverdueInvoiceDetail[] // Lista de facturi
}
