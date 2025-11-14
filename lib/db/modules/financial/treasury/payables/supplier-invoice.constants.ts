export const SUPPLIER_INVOICE_STATUSES = [
  'NEPLATITA',
  'PARTIAL_PLATITA',
  'PLATITA',
  'ANULATA',
] as const

export type SupplierInvoiceStatus = (typeof SUPPLIER_INVOICE_STATUSES)[number]

export const SUPPLIER_INVOICE_STATUS_MAP: Record<
  SupplierInvoiceStatus,
  { name: string; variant: 'success' | 'destructive' | 'secondary' | 'outline' }
> = {
  NEPLATITA: {
    name: 'Neplătită',
    variant: 'destructive',
  },
  PARTIAL_PLATITA: {
    name: 'Plătită Parțial',
    variant: 'secondary',
  },
  PLATITA: {
    name: 'Plătită',
    variant: 'success',
  },
  ANULATA: {
    name: 'Anulată',
    variant: 'outline',
  },
}
