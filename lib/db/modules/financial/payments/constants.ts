
export const PAYMENT_DOCUMENT_TYPES = [
  'Chitanta',
  'OP',
  'BonFiscal',
  'ExtrasCont',
] as const
export type PaymentDocumentType = (typeof PAYMENT_DOCUMENT_TYPES)[number]

// Direcția plății
export const PAYMENT_DIRECTIONS = ['IN', 'OUT'] as const
export type PaymentDirection = (typeof PAYMENT_DIRECTIONS)[number]
