import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VehicleForm from '../vehicle-form'
import { getVehicleById } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vehicle = await getVehicleById(id)

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline' size='icon'>
          <Link href='/admin/management/fleet/vehicles'>
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Editează: {vehicle.name}</h1>
      </div>
      <VehicleForm initialValues={vehicle} />
    </div>
  )
}
