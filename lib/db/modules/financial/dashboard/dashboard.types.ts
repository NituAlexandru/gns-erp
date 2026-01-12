import { OverdueClientSummary } from '../treasury/summary/summary.types'

export interface DashboardStats {
  ordersCount: number
  deliveryNotesCount: number
  invoicesCount: number
  proformasCount: number
  creditNotesCount: number
  receiptsCount: number
}

export interface RecentDocument {
  id: string
  number: string
  clientName: string
  status: string
  date: string | Date
  type: 'INVOICE' | 'DELIVERY_NOTE'
}
export interface BlockedClientSummary {
  id: string
  clientName: string
  outstandingBalance: number // Soldul actual
  creditLimit: number // Limita
  excessAmount: number // Depășirea (Sold - Limită)
  lockingStatus: 'AUTO' | 'MANUAL_BLOCK' | 'MANUAL_UNBLOCK'
  lockingReason?: string
}
export interface FinancialDashboardData {
  stats: DashboardStats
  recentDeliveryNotes: RecentDocument[]
  blockedClients: BlockedClientSummary[]
  overdueClients: OverdueClientSummary[]
}
