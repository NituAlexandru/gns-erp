export type TreasuryStaticStats = {
  totalDeIncasat: number
  totalDePlatit: number
}

export type OverdueInvoiceDetail = {
  _id: string
  seriesName: string
  invoiceNumber: string
  dueDate: string
  remainingAmount: number
  daysOverdue: number
}

export type OverdueClientSummary = {
  _id: string
  clientName: string
  totalOverdue: number
  overdueInvoices: OverdueInvoiceDetail[]
}

export type ClientLedgerEntry = {
  _id: string
  date: Date
  documentType: 'Factură' | 'Încasare' | 'Storno'
  documentNumber: string
  details: string
  debit: number
  credit: number
  runningBalance: number
}
