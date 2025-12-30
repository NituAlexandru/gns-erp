import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

export const NIR_STATUSES = ['CONFIRMED', 'CANCELLED'] as const

export type NirStatusKey = (typeof NIR_STATUSES)[number]

export const NIR_STATUS_MAP: Record<
  NirStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  CONFIRMED: { name: 'Confirmat', variant: 'success' },
  CANCELLED: { name: 'Anulat', variant: 'destructive' },
}
