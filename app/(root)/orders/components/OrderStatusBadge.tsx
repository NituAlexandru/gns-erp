'use client'

import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_MAP } from '@/lib/db/modules/order/constants'
import { OrderStatusKey } from '@/lib/db/modules/order/types'

interface OrderStatusBadgeProps {
  status: OrderStatusKey
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_MAP[status] || {
    name: 'Necunoscut',
    variant: 'secondary',
  }

  return (
    <Badge variant={config.variant} className='whitespace-nowrap'>
      {config.name}
    </Badge>
  )
}
