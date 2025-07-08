import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ClientForm from '../client-form'

export default function NewClientPage() {
  return (
    <div className='max-w-3xl mx-auto p-6 space-y-6 pt-0'>
      <div className='flex items-center gap-4'>
        <Button asChild variant='outline'>
          <Link href='/clients'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Adaugă client nou</h1>
      </div>
      <ClientForm />
    </div>
  )
}
