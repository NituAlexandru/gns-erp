'use client'

import { Badge } from '@/components/ui/badge'
import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'
import { SupplierPaymentStatus } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.constants'

const STATUS_MAP: Record<
  SupplierPaymentStatus,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  NEALOCATA: { name: 'Nealocată', variant: 'destructive' },
  PARTIAL_ALOCATA: { name: 'Parțial Alocată', variant: 'info' },
  ALOCATA: { name: 'Alocată', variant: 'success' },
  ANULATA: { name: 'Anulată', variant: 'outline' },
}

export function SupplierPaymentStatusBadge({
  status,
}: {
  status: SupplierPaymentStatus
}) {
  const info = STATUS_MAP[status] || {
    name: status,
    variant: 'secondary',
  }

  return (
    <Badge variant={info.variant} className='whitespace-nowrap'>
      {info.name}
    </Badge>
  )
}
