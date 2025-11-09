export const PAYMENT_METHODS = [
  'ORDIN_DE_PLATA',
  'CARD',
  'CASH',
  'BILET_LA_ORDIN',
  'COMPENSARE',
  'ALTUL',
] as const

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_MAP: Record<PaymentMethodKey, { name: string }> = {
  ORDIN_DE_PLATA: { name: 'Ordin de Plată (OP)' },
  CARD: { name: 'Card Bancar' },
  CASH: { name: 'Numerar (Cash)' },
  BILET_LA_ORDIN: { name: 'Bilet la Ordin (BO)' },
  COMPENSARE: { name: 'Compensare' },
  ALTUL: { name: 'Altă Metodă' },
}
