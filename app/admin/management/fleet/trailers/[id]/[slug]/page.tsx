import { toSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, FilePenLine } from 'lucide-react'
import { getTrailerById } from '@/lib/db/modules/fleet/trailers/trailers.actions'

export default async function TrailerViewPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const { id, slug } = await params
  const trailer = await getTrailerById(id)
  if (!trailer) {
    notFound()
  }

  const canonicalSlug = toSlug(trailer.name)
  if (slug !== canonicalSlug) {
    return redirect(
      `/admin/management/fleet/trailers/${trailer._id}/${canonicalSlug}`
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-4'>
          <Button asChild variant='outline' size='icon'>
            <Link href='/admin/management/fleet/trailers'>
              <ChevronLeft />
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>Detalii: {trailer.name}</h1>
        </div>
        <Button asChild>
          <Link href={`/admin/management/fleet/trailers/${trailer._id}/edit`}>
            <FilePenLine className='mr-2 h-4 w-4' />
            Editează Remorca
          </Link>
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 border rounded-lg p-4'>
        <div className='space-y-2'>
          <h3 className='font-semibold'>Informații Principale</h3>
          <p>
            <strong>Nume:</strong> {trailer.name}
          </p>
          <p>
            <strong>Tip:</strong> {trailer.type}
          </p>
          <p>
            <strong>Nr. Înmatriculare:</strong> {trailer.licensePlate}
          </p>
          <p>
            <strong>An:</strong> {trailer.year || 'N/A'}
          </p>
        </div>

        <div className='space-y-2'>
          <h3 className='font-semibold'>Specificații Marfă</h3>
          <p>
            <strong>Sarcină Utilă:</strong> {trailer.maxLoadKg} kg
          </p>
          <p>
            <strong>Volum Util:</strong> {trailer.maxVolumeM3} m³
          </p>
          <p>
            <strong>Dimensiuni (L/l/Î):</strong>{' '}
            {`${trailer.lengthCm}x${trailer.widthCm}x${trailer.heightCm} cm`}
          </p>
        </div>

        {trailer.notes && (
          <div className='space-y-2'>
            <h3 className='font-semibold'>Notițe</h3>
            <p className='italic text-muted-foreground'>{trailer.notes}</p>
          </div>
        )}
      </div>

      <div className='text-sm text-muted-foreground flex flex-wrap gap-x-6 justify-end'>
        {trailer.createdBy && (
          <p>
            <strong>Creat de:</strong> {trailer.createdBy.name}
          </p>
        )}
        <p>
          <strong>Creat la:</strong>{' '}
          {new Date(trailer.createdAt).toLocaleString('ro-RO')}
        </p>
        {trailer.updatedBy && (
          <p>
            <strong>Actualizat de:</strong> {trailer.updatedBy.name}
          </p>
        )}
        <p>
          <strong>Actualizat la:</strong>{' '}
          {new Date(trailer.updatedAt).toLocaleString('ro-RO')}
        </p>
      </div>
    </div>
  )
}
