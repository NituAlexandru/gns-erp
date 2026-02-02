import { getAllOrders } from '@/lib/db/modules/order/order.actions'
import { OrdersList } from './components/OrdersList'
import { auth } from '@/auth'

interface PageProps {
  searchParams: Promise<{
    page?: string
    q?: string
    status?: string
    minTotal?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const page = Number(resolvedParams.page) || 1
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  const { data, totalPages } = await getAllOrders(page, {
    q: resolvedParams.q,
    status: resolvedParams.status,
    minTotal: resolvedParams.minTotal
      ? Number(resolvedParams.minTotal)
      : undefined,
    dateFrom: resolvedParams.dateFrom,
    dateTo: resolvedParams.dateTo,
  })

  return (
    <OrdersList
      orders={data}
      totalPages={totalPages}
      currentPage={page}
      isAdmin={isAdmin}
    />
  )
}
