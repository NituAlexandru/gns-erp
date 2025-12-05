import FilterControls from '../components/list/FilterControls'
import DeliveriesList from '../components/list/DeliveriesList'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DeliveriesListPage() {
  const statuses = Object.entries(DELIVERY_STATUS_MAP).map(([value, info]) => ({
    value,
    label: info.name ?? value,
  }))

  return (
    <div className='space-y-1'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>Listă Livrări</h1>
        <Button asChild variant='outline'>
          <Link href='/deliveries'>Vezi Programarile</Link>
        </Button>
      </div>

      <FilterControls statuses={statuses} />
      <DeliveriesList />
    </div>
  )
}
