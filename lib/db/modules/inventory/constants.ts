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
  // Operațiuni Interne / Ajustări
  'BON_DE_CONSUM',
  'RETUR_FURNIZOR',
  'PIERDERE',
  'ANULARE_RECEPTIE',
  'DETERIORARE',
  'PLUS_INVENTAR',
  // Intrări
  'RECEPTIE',
  'RETUR_CLIENT',

  // Ieșiri (Vânzări - Sincronizate cu Order Delivery Methods)
  'DIRECT_SALE', // Vânzare Directă
  'DELIVERY_FULL_TRUCK', // Livrare Depozit (TIR Complet)
  'DELIVERY_CRANE', // Livrare Depozit (Macara)
  'DELIVERY_SMALL_VEHICLE_PJ', // Livrare Depozit (Vehicul Mic PJ)
  'RETAIL_SALE_PF', // Vânzare Retail (PF)
  'PICK_UP_SALE', // Ridicare Comanda de Client
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

  // Operațiuni Negative (dar nu vânzări standard)
  BON_DE_CONSUM: { name: 'Bon de Consum', variant: 'destructive' },
  RETUR_FURNIZOR: { name: 'Retur la Furnizor', variant: 'destructive' },
  PIERDERE: { name: 'Pierdere', variant: 'destructive' },
  DETERIORARE: { name: 'Deteriorare', variant: 'destructive' },
  ANULARE_RECEPTIE: { name: 'Anulare Recepție', variant: 'secondary' },

  // --- Ieșiri (Vânzări) ---
  DIRECT_SALE: { name: 'Vânzare Directă', variant: 'destructive' },
  DELIVERY_FULL_TRUCK: { name: 'Vânzare (TIR)', variant: 'destructive' },
  DELIVERY_CRANE: { name: 'Vânzare (Macara)', variant: 'destructive' },
  DELIVERY_SMALL_VEHICLE_PJ: {
    name: 'Vânzare (Auto Mic)',
    variant: 'destructive',
  },
  RETAIL_SALE_PF: { name: 'Vânzare Retail', variant: 'destructive' },
  PICK_UP_SALE: { name: 'Ridicare din Depozit', variant: 'destructive' },
}

export const OUT_TYPES = new Set<StockMovementType>([
  'BON_DE_CONSUM',
  'RETUR_FURNIZOR',
  'PIERDERE',
  'DETERIORARE',
  'ANULARE_RECEPTIE',
  // Vânzările noi
  'DIRECT_SALE',
  'DELIVERY_FULL_TRUCK',
  'DELIVERY_CRANE',
  'DELIVERY_SMALL_VEHICLE_PJ',
  'RETAIL_SALE_PF',
  'PICK_UP_SALE',
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
