'use client'
import { Badge } from '@/components/ui/badge'
import {
  EFACTURA_STATUS_MAP,
  EFacturaStatusKey,
} from '@/lib/db/modules/financial/invoices/invoice.constants'

export function EFacturaStatusBadge({ status }: { status: EFacturaStatusKey }) {
  const { name, variant } = EFACTURA_STATUS_MAP[status] || {
    name: 'N/A',
    variant: 'secondary',
  }
  return <Badge variant={variant}>{name}</Badge>
}
