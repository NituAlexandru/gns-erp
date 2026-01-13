import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AssignmentsForm from '../assignments-form'
import { IAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { getAssignmentById } from '@/lib/db/modules/fleet/assignments/assignments.actions'
import { getAllDrivers } from '@/lib/db/modules/fleet/drivers/drivers.actions'
import { getAllVehicles } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'
import { getAllTrailers } from '@/lib/db/modules/fleet/trailers/trailers.actions'

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const assignment = (await getAssignmentById(id)) as IAssignmentDoc

  // 👇 MODIFICARE 2: Luăm listele complete. Nu mai e nevoie de nicio logică extra.
  const allDrivers = await getAllDrivers()
  const allVehicles = await getAllVehicles()
  const allTrailers = await getAllTrailers()

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
        driversList={allDrivers}
        vehiclesList={allVehicles}
        trailersList={allTrailers}
      />
    </div>
  )
}
