import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

// --- Delivery Note (Aviz) statuses ---
export const DELIVERY_NOTE_STATUSES = [
  'IN_TRANSIT',
  'DELIVERED',
  'INVOICED',
  'CANCELLED',
] as const

export type DeliveryNoteStatusKey = (typeof DELIVERY_NOTE_STATUSES)[number]

export const DELIVERY_NOTE_STATUS_MAP: Record<
  DeliveryNoteStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  IN_TRANSIT: { name: 'În Tranzit', variant: 'warning' },
  DELIVERED: { name: 'Livrat', variant: 'success' },
  INVOICED: { name: 'Facturat', variant: 'info' },
  CANCELLED: { name: 'Anulat', variant: 'destructive' },
}

// --- e-Transport statuses (future-ready) ---
export const E_TRANSPORT_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'SENT',
  'COMPLETED',
  'ERROR',
] as const

export type ETransportStatusKey = (typeof E_TRANSPORT_STATUSES)[number]

export const E_TRANSPORT_STATUS_MAP: Record<
  ETransportStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  NOT_REQUIRED: { name: 'Nu este necesar', variant: 'secondary' },
  PENDING: { name: 'În așteptare', variant: 'default' },
  SENT: { name: 'Transmis', variant: 'warning' },
  COMPLETED: { name: 'Finalizat', variant: 'success' },
  ERROR: { name: 'Eroare', variant: 'destructive' },
}
