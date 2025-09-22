import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AssignmentsForm from '../assignments-form'
import { getAvailableDrivers } from '@/lib/db/modules/fleet/drivers/drivers.actions'
import { getAvailableVehicles } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'
import { getAvailableTrailers } from '@/lib/db/modules/fleet/trailers/trailers.actions'

export default async function NewAssignmentPage() {
  const drivers = await getAvailableDrivers()
  const vehicles = await getAvailableVehicles()
  const trailers = await getAvailableTrailers()

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline' size='icon'>
          <Link href='/admin/management/fleet/assignments'>
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Adaugă Ansamblu Nou</h1>
      </div>
      <AssignmentsForm
        driversList={drivers}
        vehiclesList={vehicles}
        trailersList={trailers}
      />
    </div>
  )
}
