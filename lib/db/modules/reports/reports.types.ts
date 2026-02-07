export type ReportFilterType =
  | 'dateRange'
  | 'month'
  | 'year'
  | 'category'
  | 'status'
  | 'location'
  | 'itemType'
  | 'includeZeroStock'

export type ReportCategory =
  | 'inventory'
  | 'financial'
  | 'sales'
  | 'operational'
  | 'clients'
  | 'suppliers'
  | 'products'
  | 'receptions'

export interface ReportDefinition {
  id: string
  title: string
  description: string
  category: ReportCategory
  icon: string
  filters: ReportFilterType[]
}

export const REPORT_CATEGORIES = [
  { id: 'inventory', label: 'Gestiune Stocuri' },
  { id: 'financial', label: 'Financiar & Contabil' },
  { id: 'sales', label: 'Vânzări' },
  { id: 'operational', label: 'Operațional' },
  { id: 'clients', label: 'Clienți' },
  { id: 'suppliers', label: 'Furnizori' },
  { id: 'products', label: 'Produse' },
  { id: 'receptions', label: 'Recepții' },
]

export const AVAILABLE_REPORTS: ReportDefinition[] = [
  {
    id: 'inventory-valuation',
    title: 'Stoc Curent',
    description:
      'Lista completă a produselor cu stoc existent și valoarea lor de achiziție.',
    category: 'inventory',
    icon: 'Layers',
    filters: ['location', 'itemType', 'includeZeroStock'],
  },
  {
    id: 'sales-period',
    title: 'Vânzări pe Perioadă',
    description: 'Sumar al încasărilor și facturilor emise.',
    category: 'sales',
    icon: 'FileText',
    filters: ['dateRange'],
  },
]
