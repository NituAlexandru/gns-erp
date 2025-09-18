import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DriverForm from '../driver-form'
import { getDriverById } from '@/lib/db/modules/fleet/drivers/drivers.actions'

export default async function EditDriverPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const driver = await getDriverById(id)

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline' size='icon'>
          <Link href='/admin/management/fleet/drivers'>
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Editează: {driver.name}</h1>
      </div>
      <DriverForm initialValues={driver} />
    </div>
  )
}
