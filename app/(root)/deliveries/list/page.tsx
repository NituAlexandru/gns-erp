import { getFilteredDeliveries } from '@/lib/db/modules/deliveries/delivery.actions'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import FilterControls from '../components/list/FilterControls'
import { DeliveriesTable } from '../components/list/DeliveriesTable'
import DeliveriesList from '../components/list/DeliveriesList'

interface PageProps {
  searchParams: Promise<{
    page?: string
    generalSearch?: string
    status?: string
    startDate?: string
    endDate?: string
  }>
}

export default async function DeliveriesListPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const page = Number(resolvedParams.page) || 1

  // 1. Fetch Data
  const { data, pagination, currentYearCount } = await getFilteredDeliveries({
    search: resolvedParams.generalSearch,
    status: resolvedParams.status,
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    page: page,
  })

  // 2. Configurare Statusuri pentru Filtru
  const statuses = Object.entries(DELIVERY_STATUS_MAP).map(([value, info]) => ({
    value,
    label: info.name ?? value,
  }))

  return (
    <div className='w-full p-0 max-w-full space-y-4'>
      <div className='flex justify-between items-center mb-2 shrink-0'>
        <h1 className='text-2xl font-bold'>Listă Livrări</h1>
        <FilterControls statuses={statuses} />
        <Button asChild variant='outline'>
          <Link href='/deliveries'>Vezi Programările</Link>
        </Button>
      </div>

      <DeliveriesList
        deliveries={data}
        pagination={pagination}
        currentYearCount={currentYearCount}
      />
    </div>
  )
}
