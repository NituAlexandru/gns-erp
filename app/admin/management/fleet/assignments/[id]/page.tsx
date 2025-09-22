import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AssignmentsForm from '../assignments-form'
import { IAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { getAssignmentById } from '@/lib/db/modules/fleet/assignments/assignments.actions'
import {
  getAvailableDrivers,
  getDriverById,
} from '@/lib/db/modules/fleet/drivers/drivers.actions'
import {
  getAvailableVehicles,
  getVehicleById,
} from '@/lib/db/modules/fleet/vehicle/vehicle.actions'
import {
  getAvailableTrailers,
  getTrailerById,
} from '@/lib/db/modules/fleet/trailers/trailers.actions'

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const assignment = (await getAssignmentById(id)) as IAssignmentDoc
  const availableDrivers = await getAvailableDrivers()
  const availableVehicles = await getAvailableVehicles()
  const availableTrailers = await getAvailableTrailers()

  if (assignment.driverId) {
    const currentDriver = await getDriverById(
      String(
        typeof assignment.driverId === 'object'
          ? assignment.driverId._id
          : assignment.driverId
      )
    )
    if (!availableDrivers.some((d) => d._id === currentDriver._id)) {
      availableDrivers.unshift(currentDriver)
    }
  }

  if (assignment.vehicleId) {
    const currentVehicle = await getVehicleById(
      String(
        typeof assignment.vehicleId === 'object'
          ? assignment.vehicleId._id
          : assignment.vehicleId
      )
    )
    if (!availableVehicles.some((v) => v._id === currentVehicle._id)) {
      availableVehicles.unshift(currentVehicle)
    }
  }

  if (assignment.trailerId) {
    const currentTrailer = await getTrailerById(
      String(
        typeof assignment.trailerId === 'object'
          ? assignment.trailerId._id
          : assignment.trailerId
      )
    )
    if (
      currentTrailer &&
      !availableTrailers.some((t) => t._id === currentTrailer._id)
    ) {
      availableTrailers.unshift(currentTrailer)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline' size='icon'>
          <Link href='/admin/management/fleet/assignments'>
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Editează: {assignment.name}</h1>
      </div>
      <AssignmentsForm
        initialValues={assignment}
        driversList={availableDrivers}
        vehiclesList={availableVehicles}
        trailersList={availableTrailers}
      />
    </div>
  )
}
