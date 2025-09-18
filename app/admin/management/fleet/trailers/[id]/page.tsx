import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TrailerForm from '../trailer-form'
import { getTrailerById } from '@/lib/db/modules/fleet/trailers/trailers.actions'

export default async function EditTrailerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const trailer = await getTrailerById(id)

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline' size='icon'>
          <Link href='/admin/management/fleet/trailers'>
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Editează: {trailer.name}</h1>
      </div>
      <TrailerForm initialValues={trailer} />
    </div>
  )
}
