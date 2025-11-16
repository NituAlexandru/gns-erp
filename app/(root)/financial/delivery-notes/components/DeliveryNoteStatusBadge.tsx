'use client'

import { Badge } from '@/components/ui/badge'
import { DeliveryNoteStatusKey } from '@/lib/db/modules/financial/delivery-notes/delivery-note.constants'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'

export function DeliveryNoteStatusBadge({
  status,
}: {
  status: DeliveryNoteStatusKey
}) {
  const statusInfo = DELIVERY_STATUS_MAP[status] || {
    name: status || 'Necunoscut',
    variant: 'secondary',
  }

  return (
    <Badge variant={statusInfo.variant} className='whitespace-nowrap'>
      {statusInfo.name}
    </Badge>
  )
}
