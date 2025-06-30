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
  'AJUSTARE_STOC_OUT', // OUT
  'RECEPTIE', // IN
  'RETUR_CLIENT', // IN
  'AJUSTARE_STOC_IN', // IN
] as const

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]
