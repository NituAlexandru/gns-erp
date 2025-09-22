import { toSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeft, FilePenLine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { IAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { getAssignmentById } from '@/lib/db/modules/fleet/assignments/assignments.actions'

type PopulatedField = string | { _id: string; name: string } | null | undefined

const isPopulated = (
  field: PopulatedField
): field is { _id: string; name: string } => {
  return typeof field === 'object' && field !== null && '_id' in field
}

export default async function AssignmentViewPage({
  params,
}: {
  params: Promise<{ id: string; slug: string }>
}) {
  const { id, slug } = await params
  const assignment = (await getAssignmentById(id)) as IAssignmentDoc

  if (!assignment) {
    notFound()
  }

  const canonicalSlug = toSlug(assignment.name)
  if (slug !== canonicalSlug) {
    return redirect(
      `/admin/management/fleet/assignments/${assignment._id}/${canonicalSlug}`
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-4'>
          <Button asChild variant='outline' size='icon'>
            <Link href='/admin/management/fleet/assignments'>
              <ChevronLeft />
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>
            Detalii Ansamblu: {assignment.name}
          </h1>
        </div>
        <Button asChild>
          <Link
            href={`/admin/management/fleet/assignments/${assignment._id}/edit`}
          >
            <FilePenLine className='mr-2 h-4 w-4' />
            Editează Ansamblu
          </Link>
        </Button>
      </div>

      <div className='border rounded-lg p-6'>
        <div className='flex justify-between items-start mb-4'>
          <div>
            <h2 className='text-lg font-semibold'>{assignment.name}</h2>
            <p className='text-sm text-muted-foreground'>
              Status:{' '}
              <Badge
                variant={
                  assignment.status === 'Activ' ? 'default' : 'secondary'
                }
              >
                {assignment.status}
              </Badge>
            </p>
          </div>
          {assignment.notes && (
            <p className='text-sm italic text-muted-foreground max-w-sm'>
              Notițe: {assignment.notes}
            </p>
          )}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-4'>
          {/* Detalii Șofer */}
          <div className='space-y-2'>
            <h3 className='font-semibold'>Șofer</h3>
            {isPopulated(assignment.driverId) ? (
              <>
                <p>
                  <strong>Nume:</strong> {assignment.driverId.name}
                </p>
                <p>
                  <strong>Telefon:</strong> {assignment.driverId.phone}
                </p>
                <p>
                  <strong>Permis:</strong>{' '}
                  {assignment.driverId.drivingLicenses.join(', ')}
                </p>
              </>
            ) : (
              <p>N/A</p>
            )}
          </div>

          {/* Detalii Vehicul */}
          <div className='space-y-2'>
            <h3 className='font-semibold'>Vehicul</h3>
            {isPopulated(assignment.vehicleId) ? (
              <>
                <p>
                  <strong>Nume:</strong> {assignment.vehicleId.name}
                </p>
                <p>
                  <strong>Nr. Înmatriculare:</strong>{' '}
                  {assignment.vehicleId.carNumber}
                </p>
                <p>
                  <strong>Tip:</strong> {assignment.vehicleId.carType}
                </p>
              </>
            ) : (
              <p>N/A</p>
            )}
          </div>

          {/* Detalii Remorcă */}
          <div className='space-y-2'>
            <h3 className='font-semibold'>Remorcă</h3>
            {isPopulated(assignment.trailerId) ? (
              <>
                <p>
                  <strong>Nume:</strong> {assignment.trailerId.name}
                </p>
                <p>
                  <strong>Nr. Înmatriculare:</strong>{' '}
                  {assignment.trailerId.licensePlate}
                </p>
                <p>
                  <strong>Tip:</strong> {assignment.trailerId.type}
                </p>
              </>
            ) : (
              <p>Fără</p>
            )}
          </div>
        </div>
      </div>

      <div className='text-sm text-muted-foreground flex flex-wrap gap-x-6 justify-end'>
        {assignment.createdBy && (
          <p>
            <strong>Creat de:</strong> {assignment.createdBy.name}
          </p>
        )}
        <p>
          <strong>Creat la:</strong>{' '}
          {new Date(assignment.createdAt).toLocaleString('ro-RO')}
        </p>
        {assignment.updatedBy && (
          <p>
            <strong>Actualizat de:</strong> {assignment.updatedBy.name}
          </p>
        )}
        <p>
          <strong>Actualizat la:</strong>{' '}
          {new Date(assignment.updatedAt).toLocaleString('ro-RO')}
        </p>
      </div>
    </div>
  )
}
