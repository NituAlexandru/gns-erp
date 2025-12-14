import { getSupplierOrderFormInitialData } from '@/lib/db/modules/supplier-orders/supplier-order.actions'
import { SupplierOrderForm } from '../components/SupplierOrderForm'

export default async function NewSupplierOrderPage() {
  const initialDataRes = await getSupplierOrderFormInitialData()
  const vatRates =
    initialDataRes.success && initialDataRes.data
      ? initialDataRes.data.vatRates
      : []

  return (
    <div>
      <SupplierOrderForm vatRates={vatRates} />
    </div>
  )
}
