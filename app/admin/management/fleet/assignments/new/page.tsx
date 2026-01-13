import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AssignmentsForm from '../assignments-form'
import { getAllDrivers } from '@/lib/db/modules/fleet/drivers/drivers.actions'
import { getAllVehicles } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'
import { getAllTrailers } from '@/lib/db/modules/fleet/trailers/trailers.actions'

export default async function NewAssignmentPage() {
  const drivers = await getAllDrivers()
  const vehicles = await getAllVehicles()
  const trailers = await getAllTrailers()

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
