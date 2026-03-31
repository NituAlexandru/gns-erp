export interface PenaltyRuleDTO {
  _id: string
  name: string
  percentagePerDay: number
  autoBillDays: number
  isDefault: boolean
  isAutoBillingEnabled: boolean
  clientIds: string[]
  clientCount: number // O vom calcula în acțiune pt UI
  updatedBy?: string
  updatedByName?: string
  updatedAt?: string
}

export interface PenaltyRecordDTO {
  _id: string
  invoiceId: string
  clientId: string
  periodEnd: string
  amountCalculated: number
  penaltyInvoiceId?: string
  createdBy: string
  createdByName: string
  createdAt: string
}

export interface CalculatedPenaltyResult {
  invoiceId: string
  clientId: string
  clientName: string
  documentNumber: string
  seriesName: string
  dueDate: string
  remainingAmount: number
  unbilledDays: number
  penaltyAmount: number
  appliedPercentage: number
  isManualBilling: boolean // Poate rămâne pt backwards compatibility sau extinderi
}
