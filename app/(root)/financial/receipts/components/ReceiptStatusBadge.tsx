'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  RECEIPT_STATUS_MAP,
  ReceiptStatusKey,
} from '@/lib/db/modules/financial/receipts/receipt.constants'

interface ReceiptStatusBadgeProps {
  status: string
  className?: string
}

export function ReceiptStatusBadge({
  status,
  className,
}: ReceiptStatusBadgeProps) {
  const statusConfig = RECEIPT_STATUS_MAP[status as ReceiptStatusKey] || {
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
