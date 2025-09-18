import { toSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, FilePenLine } from 'lucide-react'
import { getVehicleById } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'

export default async function VehicleViewPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  // ✅ FIX: Am adăugat 'await' aici
  const { id, slug } = await params

  const vehicle = await getVehicleById(id)
  if (!vehicle) {
    notFound()
  }

  const canonicalSlug = toSlug(vehicle.name)
  if (slug !== canonicalSlug) {
    return redirect(
      `/admin/management/fleet/vehicles/${vehicle._id}/${canonicalSlug}`
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-4'>
          <Button asChild variant='outline' size='icon'>
            <Link href='/admin/management/fleet/vehicles'>
              <ChevronLeft />
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>Detalii: {vehicle.name}</h1>
        </div>
        <Button asChild>
          <Link href={`/admin/management/fleet/vehicles/${vehicle._id}`}>
            <FilePenLine className='mr-2 h-4 w-4' />
            Editează Vehicul
          </Link>
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 border rounded-lg p-4'>
        {/* Coloana 1: Detalii principale */}
        <div className='space-y-2'>
          <h3 className='font-semibold'>Informații Principale</h3>
          <p>
            <strong>Tip:</strong> {vehicle.carType}
          </p>
          <p>
            <strong>Nr. Înmatriculare:</strong> {vehicle.carNumber}
          </p>
          <p>
            <strong>Marcă/Model:</strong> {vehicle.brand || ''}{' '}
            {vehicle.model || ''}
          </p>
          <p>
            <strong>An:</strong> {vehicle.year || 'N/A'}
          </p>
        </div>
        {/* Coloana 2: Specificații */}
        <div className='space-y-2'>
          <h3 className='font-semibold'>Specificații Marfă</h3>
          <p>
            <strong>Sarcină Utilă:</strong> {vehicle.maxLoadKg} kg
          </p>
          <p>
            <strong>Volum Util:</strong> {vehicle.maxVolumeM3} m³
          </p>
          <p>
            <strong>Dimensiuni utile (L/l/Î):</strong>{' '}
            {`${vehicle.lengthCm}x${vehicle.widthCm}x${vehicle.heightCm} cm`}
          </p>
        </div>
        {/* Coloana 3: Detalii Operaționale */}
        <div className='space-y-2'>
          <h3 className='font-semibold'>Detalii Operaționale</h3>
          <p>
            <strong>Tarif:</strong> {vehicle.ratePerKm} LEI/km
          </p>
          {vehicle.notes && (
            <p>
              <strong>Notițe:</strong> {vehicle.notes}
            </p>
          )}
        </div>
      </div>
      <div className='text-sm text-muted-foreground flex flex-wrap gap-x-6 justify-end'>
        <div>
          <p>
            <strong>Creat la:</strong>{' '}
            {new Date(vehicle.createdAt).toLocaleString('ro-RO')}
          </p>{' '}
          {vehicle.createdBy && (
            <p>
              <strong>Creat de:</strong> {vehicle.createdBy.name}
            </p>
          )}
        </div>
        <div>
          <p>
            <strong>Actualizat la:</strong>{' '}
            {new Date(vehicle.updatedAt).toLocaleString('ro-RO')}
          </p>
          {vehicle.updatedBy && (
            <p>
              <strong>Actualizat de:</strong> {vehicle.updatedBy.name}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
