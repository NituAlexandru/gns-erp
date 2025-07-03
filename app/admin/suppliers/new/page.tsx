import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import SupplierForm from '../[id]/supplier-form'
import { Button } from '@/components/ui/button'

export default function NewSupplierPage() {
  return (
    <div className='max-w-6xl mx-auto p-6 pt-0 space-y-6'>
      <div className='flex items-center gap-4 mb-5'>
        {' '}
        <Button asChild variant='outline'>
          <Link href='/admin/suppliers'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>{' '}
        <h1 className='text-2xl font-bold'>Adaugă un furnizor nou</h1>
      </div>

      <SupplierForm />
    </div>
  )
}
