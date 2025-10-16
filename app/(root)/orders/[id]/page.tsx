
import { getOrderById } from '@/lib/db/modules/order/order.actions'
import { OrderDetailsView } from '../components/OrderDetailsView' 

export default async function OrderDetailsPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = await paramsPromise
  const order = await getOrderById(params.id)

  if (!order) {
    return (
      <div className='p-8 text-center'>
        <h1 className='text-2xl font-bold'>Comanda nu a fost găsită</h1>
        <p className='text-muted-foreground'>
          Verificați ID-ul comenzii și reîncercați.
        </p>
      </div>
    )
  }

  return (
    <div className='p-4 sm:p-6 lg:p-8'>
      <OrderDetailsView order={order} />
    </div>
  )
}
