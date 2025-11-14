import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

export const CLIENT_PAYMENT_STATUSES = [
  'NEALOCATA',
  'PARTIAL_ALOCAT',
  'ALOCAT_COMPLET',
  'ANULATA',
] as const

export type ClientPaymentStatus = (typeof CLIENT_PAYMENT_STATUSES)[number]

export const CLIENT_PAYMENT_STATUS_MAP: Record<
  ClientPaymentStatus,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  NEALOCATA: {
    name: 'Nealocată',
    variant: 'destructive',
  },
  PARTIAL_ALOCAT: {
    name: 'Alocată Parțial ',
    variant: 'info',
  },
  ALOCAT_COMPLET: {
    name: 'Alocată',
    variant: 'success',
  },
  ANULATA: {
    name: 'Anulată',
    variant: 'destructive',
  },
}
