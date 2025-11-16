'use client'

import { Badge } from '@/components/ui/badge'
import { VariantProps } from 'class-variance-authority'
import { badgeVariants } from '@/components/ui/badge'
import { DeliveryStatusKey } from '@/lib/db/modules/deliveries/types'

const DELIVERY_STATUS_MAP: Record<
  DeliveryStatusKey,
  { name: string; variant: VariantProps<typeof badgeVariants>['variant'] }
> = {
  CREATED: { name: 'Creată', variant: 'default' },
  SCHEDULED: { name: 'Programată', variant: 'info' },
  IN_TRANSIT: { name: 'În Tranzit', variant: 'warning' },
  DELIVERED: { name: 'Livrată', variant: 'success' },
  INVOICED: { name: 'Facturată', variant: 'info' },
  CANCELLED: { name: 'Anulată', variant: 'destructive' },
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatusKey }) {
  const statusInfo = DELIVERY_STATUS_MAP[status] || {
    name: 'Necunoscut',
    variant: 'secondary',
  }

  return (
    <Badge variant={statusInfo.variant} className='whitespace-nowrap'>
      {statusInfo.name}
    </Badge>
  )
}
