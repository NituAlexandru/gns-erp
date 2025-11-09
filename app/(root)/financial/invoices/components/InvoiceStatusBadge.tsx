'use client'
import { Badge } from '@/components/ui/badge'
import {
  INVOICE_STATUS_MAP,
  InvoiceStatusKey,
} from '@/lib/db/modules/financial/invoices/invoice.constants'

export function InvoiceStatusBadge({ status }: { status: InvoiceStatusKey }) {
  const { name, variant } = INVOICE_STATUS_MAP[status] || {
    name: 'Necunoscut',
    variant: 'default',
  }
  return <Badge variant={variant}>{name}</Badge>
}
