
export interface AgentSalesStats {
  agentId: string
  agentName: string
  totalRevenue: number // Vânzări nete (fără TVA)
  totalCost: number // Costul mărfii (COGS)
  totalProfit: number // Revenue - Cost
  profitMargin: number // (Profit / Revenue) * 100
  invoiceCount: number
}

export interface SalesChartData {
  date: string // Formatul depinde de grupare (YYYY-MM-DD sau YYYY-MM)
  revenue: number
  profit: number
}

export interface AgentOverviewResponse {
  summary: AgentSalesStats[]
  chartData: SalesChartData[]
}

export interface SalesFilterOptions {
  startDate: Date
  endDate: Date
  period: 'day' | 'week' | 'month' | 'year'
  includeDrafts?: boolean // Dacă true, include CREATED și REJECTED
  agentId?: string // Opțional, pentru filtrare pe un singur agent
}
