export type ReportFilterType =
  | 'dateRange'
  | 'month'
  | 'year'
  | 'category'
  | 'status'
  | 'location'
  | 'itemType'
  | 'includeZeroStock'
  | 'balanceType'
  | 'amountRange'
  | 'overdueDays'

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
    id: 'inventory-history',
    title: 'Istoric & Sumar Operațiuni',
    description:
      'Stocul calculat până la o dată anume sau însumarea unor anumite tipuri de mișcări (ex: doar Recepții).',
    category: 'inventory',
    icon: 'BarChart3',
    filters: ['dateRange', 'location', 'itemType'],
  },
  {
    id: 'sales-period',
    title: 'Vânzări pe Perioadă',
    description: 'Sumar al încasărilor și facturilor emise.',
    category: 'sales',
    icon: 'FileText',
    filters: ['dateRange'],
  },
  {
    id: 'agent-sales-performance',
    title: 'Performanță Vânzări Agenți',
    description:
      'Raport detaliat cu vânzări, costuri și profit per agent (Sheet separat per agent).',
    category: 'sales',
    icon: 'Users',
    filters: [],
  },
  {
    id: 'product-margins',
    title: 'Marje Profit Produse',
    description:
      'Analiză detaliată a profitului și a marjei pentru fiecare produs facturat.',
    category: 'sales',
    icon: 'BarChart3',
    filters: ['dateRange', 'itemType'],
  },
  {
    id: 'product-history',
    title: 'Fișă Istoric Produs',
    description:
      'Vezi toate intrările și ieșirile unui produs, cu conversie automată pe unitatea de măsură de bază.',
    category: 'inventory',
    icon: 'FileText',
    filters: ['dateRange', 'itemType'],
  },
  {
    id: 'client-balances',
    title: 'Solduri Clienți',
    description:
      'Situația financiară a clienților, restanțe, avansuri și sume nealocate.',
    category: 'clients',
    icon: 'Users',
    filters: ['balanceType', 'amountRange', 'overdueDays'],
  },
  {
    id: 'supplier-balances',
    title: 'Solduri Furnizori',
    description:
      'Situația financiară a furnizorilor, restanțe, avansuri și sume nealocate.',
    category: 'suppliers',
    icon: 'Users',
    filters: ['balanceType', 'amountRange', 'overdueDays'],
  },
]
