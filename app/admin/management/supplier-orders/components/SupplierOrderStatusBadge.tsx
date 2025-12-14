import { Badge } from '@/components/ui/badge'
import {
  SupplierOrderStatus,
  SUPPLIER_ORDER_STATUS_DETAILS,
} from '@/lib/db/modules/supplier-orders/supplier-order.constants'

export function SupplierOrderStatusBadge({
  status,
}: {
  status: SupplierOrderStatus
}) {
  const details = SUPPLIER_ORDER_STATUS_DETAILS[status] || {
    label: status,
    variant: 'secondary',
  }

  return <Badge variant={details.variant}>{details.label}</Badge>
}
