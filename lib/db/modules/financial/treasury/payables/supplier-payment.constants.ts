
export const SUPPLIER_PAYMENT_STATUSES = [
  'NEALOCATA',
  'PARTIAL_ALOCATA',
  'ALOCATA',
  'ANULATA',
] as const


export type SupplierPaymentStatus = (typeof SUPPLIER_PAYMENT_STATUSES)[number]

export const SUPPLIER_PAYMENT_STATUS_MAP: Record<
  SupplierPaymentStatus,
  { name: string; variant: 'success' | 'destructive' | 'info' | 'outline' }
> = {
  NEALOCATA: {
    name: 'Nealocată',
    variant: 'destructive',
  },
  PARTIAL_ALOCATA: {
    name: 'Parțial Alocată',
    variant: 'info',
  },
  ALOCATA: {
    name: 'Alocată',
    variant: 'success',
  },
  ANULATA: {
    name: 'Anulată',
    variant: 'outline',
  },
}
