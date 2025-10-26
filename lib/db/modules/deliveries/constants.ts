import { VariantProps } from 'class-variance-authority'
import { DeliveryStatusKey } from './types'
import { badgeVariants } from '@/components/ui/badge'

export const DELIVERY_SLOTS = [
  '08:00 - 09:30',
  '09:30 - 11:00',
  '11:00 - 12:30',
  '12:30 - 14:00',
  '14:00 - 15:30',
  '15:30 - 17:00',
] as const

export const DELIVERY_STATUS_MAP: Record<
  DeliveryStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  CREATED: { name: 'Creată', variant: 'secondary' }, // Starea initiala
  SCHEDULED: { name: 'Programată', variant: 'default' }, // Starea dupa programare
  IN_TRANSIT: { name: 'În Tranzit', variant: 'warning' }, // După generare Aviz
  DELIVERED: { name: 'Livrată', variant: 'success' }, // Confirmată manual
  INVOICED: { name: 'Facturată', variant: 'info' },
  CANCELLED: { name: 'Anulată', variant: 'destructive' }, // Anulată
}
