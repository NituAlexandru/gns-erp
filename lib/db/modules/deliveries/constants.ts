export const DELIVERY_STATUSES = [
  'In curs',
  'Livrata',
  'Anulata',
  'Confirmata',
] as const

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]
