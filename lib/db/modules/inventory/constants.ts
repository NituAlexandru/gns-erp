import { VariantProps } from 'class-variance-authority'
import { InventoryLocation } from './types'
import { badgeVariants } from '@/components/ui/badge'

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
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  // Intrări
  RECEPTIE: { name: 'Recepție Marfă', variant: 'default' },
  RETUR_CLIENT: { name: 'Retur de la Client', variant: 'default' },
  PLUS_INVENTAR: { name: 'Plus la Inventar', variant: 'default' },

  // Ieșiri
  BON_DE_CONSUM: { name: 'Bon de Consum', variant: 'destructive' },
  VANZARE_DIRECTA: { name: 'Vânzare Directă', variant: 'destructive' },
  VANZARE_DEPOZIT: { name: 'Vânzare din Depozit', variant: 'destructive' },
  RETUR_FURNIZOR: { name: 'Retur la Furnizor', variant: 'destructive' },
  PIERDERE: { name: 'Pierdere', variant: 'destructive' },
  DETERIORARE: { name: 'Deteriorare', variant: 'destructive' },

  // Neutre sau speciale
  ANULARE_RECEPTIE: { name: 'Anulare Recepție', variant: 'secondary' },
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

export const TRANSPORT_TYPE_MAP = {
  INTERN: 'Transport Intern',
  EXTERN_FURNIZOR: 'Transport Extern (Furnizor)',
  TERT: 'Transport Terț',
} as const
