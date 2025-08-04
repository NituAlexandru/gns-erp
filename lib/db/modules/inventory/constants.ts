export const INVENTORY_LOCATIONS = [
  'DEPOZIT', // Fizic in depozit
  'IN_TRANZIT', // - il pastrez? tinut aici de la plasarea comenzii pana la confirmarea receptiei ei
  'LIVRARE_DIRECTA', // Livrat direct de la furnizor la client
  'CUSTODIE_FURNIZOR', // Sunt platite de GNS dar nu sunt livrare inca de furnizor
  'CUSTODIE_GNS', // Nu sunt platite dar sunt livrate de catre furnizor
  'CUSTODIE_PENTRU_CLIENT', // Platit de client, urmeaza a se livra
] as const

export type InventoryLocation = (typeof INVENTORY_LOCATIONS)[number]

export const STOCK_MOVEMENT_TYPES = [
  // Labels - motivul intrare/iesire
  'BON_DE_CONSUM', // OUT
  'VANZARE_DIRECTA', // OUT
  'VANZARE_DEPOZIT', // OUT
  'RETUR_FURNIZOR', // OUT
  'PIERDERE', // OUT
  'ANULARE_RECEPTIE', // OUT
  'DETERIORARE', // OUT
  'RECEPTIE', // IN
  'RETUR_CLIENT', // IN
  'PLUS_INVENTAR', // Pentru plusuri la inventar, marfă găsită.
] as const

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]

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
