'use client'

import { Badge } from '@/components/ui/badge'
import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'
import { SupplierInvoiceStatus } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'

const STATUS_MAP: Record<
  SupplierInvoiceStatus,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  NEPLATITA: { name: 'Neplătită', variant: 'destructive' },
  PARTIAL_PLATITA: { name: 'Parțial Plătită', variant: 'info' },
  PLATITA: { name: 'Plătită', variant: 'success' },
  ANULATA: { name: 'Anulată', variant: 'outline' },
}

export function SupplierInvoiceStatusBadge({
  status,
}: {
  status: SupplierInvoiceStatus
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
