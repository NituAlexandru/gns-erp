import { InventoryLocation } from './types'

export const INVENTORY_LOCATIONS = [
  'DEPOZIT', // Fizic in depozit
  'IN_TRANZIT',
  'LIVRARE_DIRECTA',
  'CUSTODIE_FURNIZOR',
  'CUSTODIE_GNS',
  'CUSTODIE_PENTRU_CLIENT',
] as const

export const LOCATION_NAMES_MAP: Record<InventoryLocation, string> = {
  DEPOZIT: 'Depozit GNS',
  IN_TRANZIT: 'În Tranzit',
  LIVRARE_DIRECTA: 'Livrare Directă',
  CUSTODIE_FURNIZOR: 'Custodie Furnizor',
  CUSTODIE_GNS: 'Custodie GNS',
  CUSTODIE_PENTRU_CLIENT: 'Custodie Client',
}

export const STOCK_MOVEMENT_TYPES = [
  'BON_DE_CONSUM',
  'VANZARE_DIRECTA',
  'VANZARE_DEPOZIT',
  'RETUR_FURNIZOR',
  'PIERDERE',
  'ANULARE_RECEPTIE',
  'DETERIORARE',
  'RECEPTIE',
  'RETUR_CLIENT',
  'PLUS_INVENTAR',
] as const

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]

export const MOVEMENT_TYPE_DETAILS_MAP: Record<
  StockMovementType,
  { name: string }
> = {
  BON_DE_CONSUM: { name: 'Bon de Consum' },
  VANZARE_DIRECTA: { name: 'Vânzare Directă' },
  VANZARE_DEPOZIT: { name: 'Vânzare din Depozit' },
  RETUR_FURNIZOR: { name: 'Retur la Furnizor' },
  PIERDERE: { name: 'Pierdere' },
  ANULARE_RECEPTIE: { name: 'Anulare Recepție' },
  DETERIORARE: { name: 'Deteriorare' },
  RECEPTIE: { name: 'Recepție Marfă' },
  RETUR_CLIENT: { name: 'Retur de la Client' },
  PLUS_INVENTAR: { name: 'Plus la Inventar' },
}

export const OUT_TYPES = new Set<StockMovementType>([
  'BON_DE_CONSUM',
  'VANZARE_DIRECTA',
  'VANZARE_DEPOZIT',
  'RETUR_FURNIZOR',
  'PIERDERE',
  'DETERIORARE',
  'ANULARE_RECEPTIE',
])

export const IN_TYPES = new Set<StockMovementType>([
  'RECEPTIE',
  'RETUR_CLIENT',
  'PLUS_INVENTAR',
])
