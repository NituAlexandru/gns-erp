import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'

// --- Receipt (Chitanță) statuses ---
export const RECEIPT_STATUSES = ['DRAFT', 'VALID', 'CANCELLED'] as const

export type ReceiptStatusKey = (typeof RECEIPT_STATUSES)[number]

export const RECEIPT_STATUS_MAP: Record<
  ReceiptStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  DRAFT: { name: 'Ciornă', variant: 'secondary' },
  VALID: { name: 'Încasat', variant: 'success' },
  CANCELLED: { name: 'Anulată', variant: 'destructive' },
}
