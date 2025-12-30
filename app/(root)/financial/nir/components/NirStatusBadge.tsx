'use client'

import { Badge } from '@/components/ui/badge'
import {
  NIR_STATUS_MAP,
  NirStatusKey,
} from '@/lib/db/modules/financial/nir/nir.constants'
import { cn } from '@/lib/utils'

interface NirStatusBadgeProps {
  status: string
  className?: string
}

export function NirStatusBadge({ status, className }: NirStatusBadgeProps) {
  const statusConfig = NIR_STATUS_MAP[status as NirStatusKey] || {
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
