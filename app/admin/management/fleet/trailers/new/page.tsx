import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TrailerForm from '../trailer-form'

export default function NewTrailerPage() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline' size='icon'>
          <Link href='/admin/management/fleet/trailers'>
            <ChevronLeft />
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Adaugă Remorcă Nouă</h1>
      </div>
      <TrailerForm />
    </div>
  )
}
