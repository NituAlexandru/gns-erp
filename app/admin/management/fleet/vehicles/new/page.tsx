import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import VehicleForm from '../vehicle-form'

export default function NewVehiclePage() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline' size='icon'>
          <Link href='/admin/management/fleet/vehicles'>
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Adaugă Vehicul Nou</h1>
      </div>
      <VehicleForm />
    </div>
  )
}
