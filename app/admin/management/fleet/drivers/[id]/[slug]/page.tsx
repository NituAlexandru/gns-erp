import { toSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, FilePenLine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getDriverById } from '@/lib/db/modules/fleet/drivers/drivers.actions'

export default async function DriverViewPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const { id, slug } = await params
  const driver = await getDriverById(id)
  if (!driver) {
    notFound()
  }

  const canonicalSlug = toSlug(driver.name)
  if (slug !== canonicalSlug) {
    return redirect(
      `/admin/management/fleet/drivers/${driver._id}/${canonicalSlug}`
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-4'>
          <Button asChild variant='outline' size='icon'>
            <Link href='/admin/management/fleet/drivers'>
              <ChevronLeft />
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>Detalii Șofer: {driver.name}</h1>
        </div>
        <Button asChild>
          <Link href={`/admin/management/fleet/drivers/${driver._id}`}>
            <FilePenLine className='mr-2 h-4 w-4' />
            Editează Șofer
          </Link>
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6 border rounded-lg p-4'>
        <div className='space-y-2'>
          <h3 className='font-semibold'>Informații Personale</h3>
          <p>
            <strong>Nume:</strong> {driver.name}
          </p>
          <p>
            <strong>Telefon:</strong> {driver.phone}
          </p>
          <p>
            <strong>Email:</strong> {driver.email || 'N/A'}
          </p>
          <p>
            <strong>Data Angajării:</strong>{' '}
            {driver.employmentDate
              ? new Date(driver.employmentDate).toLocaleDateString('ro-RO')
              : 'N/A'}
          </p>
          <p>
            <strong>Status:</strong>{' '}
            <Badge
              variant={driver.status === 'Activ' ? 'default' : 'secondary'}
            >
              {driver.status}
            </Badge>
          </p>
        </div>
        <div className='space-y-2'>
          <h3 className='font-semibold'>Licențe și Atestate</h3>
          <p>
            <strong>Categorii Permis:</strong>{' '}
            {driver.drivingLicenses.join(', ') || 'N/A'}
          </p>
          <p>
            <strong>Certificări:</strong>{' '}
            {driver.certifications.join(', ') || 'N/A'}
          </p>
        </div>
      </div>
      {driver.notes && (
        <div className='border rounded-lg p-4'>
          <h3 className='font-semibold'>Notițe</h3>
          <p className='italic text-muted-foreground'>{driver.notes}</p>
        </div>
      )}
      <div className='text-sm text-muted-foreground flex flex-wrap gap-x-6 justify-end'>
        {driver.createdBy && (
          <p>
            <strong>Creat de:</strong> {driver.createdBy.name}
          </p>
        )}
        <p>
          <strong>Creat la:</strong>{' '}
          {new Date(driver.createdAt).toLocaleString('ro-RO')}
        </p>
        {driver.updatedBy && (
          <p>
            <strong>Actualizat de:</strong> {driver.updatedBy.name}
          </p>
        )}
        <p>
          <strong>Actualizat la:</strong>{' '}
          {new Date(driver.updatedAt).toLocaleString('ro-RO')}
        </p>
      </div>
    </div>
  )
}
