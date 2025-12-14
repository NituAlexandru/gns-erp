import { getAllSupplierOrders } from '@/lib/db/modules/supplier-orders/supplier-order.actions'
import { SupplierOrdersList } from './components/SupplierOrdersList'
import { SupplierOrdersFilters } from './components/SupplierOrdersFilters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PAGE_SIZE } from '@/lib/constants'

interface Props {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}

export default async function SupplierOrdersPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const q = params.q || ''
  const status = params.status || 'ALL'

  const initialData = await getAllSupplierOrders({
    page,
    limit: PAGE_SIZE,
    q,
    status,
  })

  // Pregătim obiectul simplu pentru filtre
  const filtersState = { q, status }

  return (
    <div className='w-full p-0'>
      <div className='flex items-center justify-between gap-4 mb-0'>
        <h1 className='text-2xl font-bold'>Comenzi Aprovizionare</h1>
        <div className='flex items-center gap-2'>
          <SupplierOrdersFilters filters={filtersState} />

          <Button asChild className='bg-primary hover:bg-primary/90'>
            <Link href='/admin/management/supplier-orders/new'>
              Comandă Nouă
            </Link>
          </Button>
        </div>
      </div>

      <SupplierOrdersList initialData={initialData} currentPage={page} />
    </div>
  )
}
