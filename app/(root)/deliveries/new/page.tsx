import { getOrderById } from '@/lib/db/modules/order/order.actions'
import { notFound, redirect } from 'next/navigation'
import { Types } from 'mongoose'
import { DeliveryPlannerClient } from '../components/DeliveryPlannerClient'
import { getDeliveriesByOrderId } from '@/lib/db/modules/deliveries/delivery.actions'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { ORDER_STATUS_MAP } from '@/lib/db/modules/order/constants'
import { OrderStatusKey } from '@/lib/db/modules/order/types'
import { connectToDatabase } from '@/lib/db'

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

    return (
      <div className='p-4 text-center text-destructive'>
        <h1>Status Comandă Invalid</h1>
        <p>
          Nu se pot planifica livrări pentru o comandă cu statusul{' '}
          {/* 👇 Afișăm statusul tradus */}
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
