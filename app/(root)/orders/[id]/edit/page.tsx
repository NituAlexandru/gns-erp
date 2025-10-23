import { getOrderById } from '@/lib/db/modules/order/order.actions'
import { OrderForm } from '../../components/OrderForm'
import { notFound } from 'next/navigation'
import { Types } from 'mongoose'

interface EditOrderPageProps {
  params: Promise<{ id: string }>
}

export default async function EditOrderPage({
  params: paramsPromise,
}: EditOrderPageProps) {
  const params = await paramsPromise
  const orderId = params.id

  if (!orderId || !Types.ObjectId.isValid(orderId)) {
    console.error(`Invalid or missing Order ID format: ${orderId}`)
    notFound()
  }

  const orderData = await getOrderById(orderId)

  if (!orderData) {
    notFound()
  }

  const canEdit = [
    'DRAFT',
    'CONFIRMED',
    'SCHEDULED',
    'PARTIALLY_SHIPPED',
  ].includes(orderData.status)

  if (!canEdit) {
    return (
      <div className='p-4 text-center text-destructive'>
        <h1>Editare Nepermisă</h1>
        <p>
          Comanda cu numărul <strong>{orderData.orderNumber}</strong> nu mai
          poate fi modificată deoarece are statusul{' '}
          <strong> {orderData.status}</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className='p-4 md:p-6'>
      <OrderForm isAdmin={true} initialOrderData={orderData} isEditing={true} />
    </div>
  )
}
