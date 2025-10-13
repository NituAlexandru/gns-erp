'use client'

import { Badge } from '@/components/ui/badge'
import { IOrder } from '@/lib/db/modules/order/order.model'

interface OrderStatusBadgeProps {
  status: IOrder['status']
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const statusConfig = {
    Ciorna: { label: 'Ciornă', variant: 'secondary' as const },
    Confirmata: { label: 'Confirmată', variant: 'default' as const },
    Livrata: { label: 'Livrată', variant: 'success' as const },
    LivrataPartial: { label: 'Livrată Parțial', variant: 'warning' as const },
    Anulata: { label: 'Anulată', variant: 'destructive' as const },
  }

  const config = statusConfig[status] || statusConfig.Ciorna

  return <Badge variant={config.variant}>{config.label}</Badge>
}
