import { getAllOrders } from '@/lib/db/modules/order/order.actions'
import { OrdersList } from './components/OrdersList'
import { auth } from '@/auth'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const session = await auth()

  const isAdmin = session?.user?.role === 'ADMIN'

  const initialData = await getAllOrders(page)

  return (
    <div className='p-4 sm:p-6 lg:p-8'>
      <OrdersList
        initialData={initialData}
        currentPage={page}
        isAdmin={isAdmin}
      />
    </div>
  )
}
