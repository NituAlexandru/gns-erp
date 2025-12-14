import { notFound } from 'next/navigation'
import { getSupplierOrderById } from '@/lib/db/modules/supplier-orders/supplier-order.actions'
import SupplierOrderDetailPage from './SupplierOrderDetailPage'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  const order = await getSupplierOrderById(id)
  if (!order) {
    notFound()
  }

  return <SupplierOrderDetailPage order={order} />
}
