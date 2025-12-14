import { notFound } from 'next/navigation'
import {
  getSupplierOrderById,
  getSupplierOrderFormInitialData,
} from '@/lib/db/modules/supplier-orders/supplier-order.actions'
import { SupplierOrderForm } from '../../components/SupplierOrderForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditSupplierOrderPage({ params }: Props) {
  const { id } = await params

  // Fetch în paralel
  const [order, initialDataRes] = await Promise.all([
    getSupplierOrderById(id),
    getSupplierOrderFormInitialData(),
  ])

  if (!order) {
    notFound()
  }

  const vatRates = initialDataRes.data.vatRates || []

  return (
    <div>
      <SupplierOrderForm isEditing initialData={order} vatRates={vatRates} />
    </div>
  )
}
