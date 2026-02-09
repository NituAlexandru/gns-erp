import { getOrderById } from '@/lib/db/modules/order/order.actions'
import { OrderDetailsView } from '../components/OrderDetailsView'
import { getDeliveriesByOrderId } from '@/lib/db/modules/deliveries/delivery.actions'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { PopulatedOrder } from '@/lib/db/modules/order/types'

function sanitizeForClient<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch (error) {
    console.error('Eroare la serializarea datelor:', error)
    return data
  }
}

export default async function OrderDetailsPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise

  const [orderRaw, deliveriesRaw] = await Promise.all([
    getOrderById(params.id),
    getDeliveriesByOrderId(params.id),
  ])

  if (!orderRaw) {
    return (
      <div className='p-8 text-center'>
        <h1 className='text-2xl font-bold'>Comanda nu a fost găsită</h1>
        <p className='text-muted-foreground'>
          Verificați ID-ul comenzii și reîncercați.
        </p>
      </div>
    )
  }

  const order = sanitizeForClient(orderRaw) as PopulatedOrder
  const deliveries = sanitizeForClient(deliveriesRaw) as IDelivery[]

  return (
    <div className='p-0'>
      <OrderDetailsView order={order} deliveries={deliveries} />
    </div>
  )
}
