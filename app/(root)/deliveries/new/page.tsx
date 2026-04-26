import { getOrderById } from '@/lib/db/modules/order/order.actions'
import { notFound, redirect } from 'next/navigation'
import { Types } from 'mongoose'
import { DeliveryPlannerClient } from '../components/DeliveryPlannerClient'
import { getDeliveriesByOrderId } from '@/lib/db/modules/deliveries/delivery.actions'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { ORDER_STATUS_MAP } from '@/lib/db/modules/order/constants'
import { OrderStatusKey } from '@/lib/db/modules/order/types'
import { connectToDatabase } from '@/lib/db'
import Link from 'next/link'

// Funcția Helper de Serializare
function sanitizeForClient<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.error('Eroare la serializarea datelor:', error)
    return data
  }
}

interface CreateDeliveryPageProps {
  searchParams: Promise<{ orderId?: string }>
}

export default async function CreateDeliveryPage({
  searchParams,
}: CreateDeliveryPageProps) {
  await connectToDatabase()

  const params = await searchParams
  const { orderId } = params

  if (!orderId || !Types.ObjectId.isValid(orderId)) {
    console.error(`Invalid or missing orderId: ${orderId}`)
    redirect('/orders')
  }

  // Preluăm Comanda
  const orderRaw = await getOrderById(orderId)
  if (!orderRaw) {
    notFound()
  }
  const order = sanitizeForClient(orderRaw)
  const allowedPlanningStatuses: string[] = [
    'CONFIRMED',
    'SCHEDULED',
    'PARTIALLY_DELIVERED',
    'DELIVERED',
    'PARTIALLY_INVOICED',
    'PARTIALLY_IN_TRANSIT',
    'IN_TRANSIT',
  ]
  let existingDeliveriesRaw: IDelivery[] = []

  if (allowedPlanningStatuses.includes(order.status)) {
    existingDeliveriesRaw = await getDeliveriesByOrderId(orderId)
  } else {
    const statusKey = order.status as OrderStatusKey
    const statusFrumos = ORDER_STATUS_MAP[statusKey]?.name || order.status

    if (order.status === 'DRAFT') {
      return (
        <div className='p-8 text-center flex flex-col items-center space-y-4'>
          <h1 className='text-2xl font-bold'>
            Comanda cu numărul{' '}
            <span className='text-primary'>#{order.orderNumber}</span> a fost
            actualizată, o poți vizualiza{' '}
            <Link
              href={`/orders/${order._id}`}
              className='text-primary hover:underline font-bold'
            >
              aici
            </Link>
            .
          </h1>
          <p className='text-amber-600 text-2xl'>
            Comanda nu poate fi programată deoarece are statusul{' '}
            <strong>"Ciornă"</strong>.
          </p>
          <p className='text-2xl'>
            Dacă vrei să o programezi pentru livrare, trebuie mai întâi să
            confirmi comanda{' '}
            <Link
              href={`/orders/${order._id}/edit`}
              className='text-primary hover:underline font-bold'
            >
              #{order.orderNumber}
            </Link>
            .
          </p>
        </div>
      )
    }

    return (
      <div className='p-4 text-center text-destructive'>
        <h1>Status Comandă Invalid</h1>
        <p>
          Nu se pot planifica livrări pentru o comandă cu statusul{' '}
          <strong>{statusFrumos}</strong>.
        </p>
      </div>
    )
  }

  const existingDeliveries = sanitizeForClient(existingDeliveriesRaw)

  return (
    <div className='p-4 md:p-2'>
      <DeliveryPlannerClient
        order={order}
        existingDeliveries={existingDeliveries}
      />
    </div>
  )
}
