import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  DELIVERY_NOTE_STATUS_MAP,
  DeliveryNoteStatusKey,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.constants'
import { cn } from '@/lib/utils'

interface DeliveryNoteStatusBadgeProps {
  status: string
  className?: string
}

export function DeliveryNoteStatusBadge({
  status,
  className,
}: DeliveryNoteStatusBadgeProps) {
  const statusConfig = DELIVERY_NOTE_STATUS_MAP[
    status as DeliveryNoteStatusKey
  ] || {
    name: status,
    variant: 'secondary',
  }

  return (
    <Badge
      variant={statusConfig.variant}
      className={cn('whitespace-nowrap', className)}
    >
      {statusConfig.name}
    </Badge>
  )
}
