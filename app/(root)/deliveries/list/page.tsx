import { getFilteredDeliveries } from '@/lib/db/modules/deliveries/delivery.actions'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import FilterControls from '../components/list/FilterControls'
import { DeliveriesTable } from '../components/list/DeliveriesTable'

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
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Listă Livrări</h1>
        <FilterControls statuses={statuses} />
        <Button asChild variant='outline'>
          <Link href='/deliveries'>Vezi Programările</Link>
        </Button>
      </div>

      {/* Randăm direct Tabelul (fără wrapper-ul intermediar dacă nu e necesar) */}
      <DeliveriesTable
        deliveries={data}
        pagination={pagination}
        currentYearCount={currentYearCount}
      />
    </div>
  )
}
