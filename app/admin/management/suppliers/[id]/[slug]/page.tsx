import { notFound, redirect } from 'next/navigation'
import { getSupplierById } from '@/lib/db/modules/suppliers/supplier.actions'
import { getSupplierSummary } from '@/lib/db/modules/suppliers/summary/supplier-summary.actions'
import { toSlug } from '@/lib/utils'
import SupplierFileView from './supplier-file-view'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default async function SupplierViewPage({
  params,
}: {

  params: Promise<{ id: string; slug: string }>
}) {
  const { id, slug } = await params

  const supplier = await getSupplierById(id)
  if (!supplier) {
    return notFound()
  }

  const summary = await getSupplierSummary(id)
  if (!summary) {
    throw new Error('Nu s-a putut încărca sumarul pentru acest furnizor.')
  }

  const canonical = toSlug(supplier.name)
  if (slug !== canonical) {
    return redirect(`/admin/management/suppliers/${id}/${canonical}`)
  }

  return (
    <div className='px-6 space-y-6'>
      <div className='flex items-center gap-4 mb-5'>
        <Button asChild variant='outline'>
          <Link href='/admin/management/suppliers'>
            <ChevronLeft /> Înapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold'>Fișă Furnizor: {supplier.name}</h1>
      </div>
      <SupplierFileView supplier={supplier} summary={summary} />
    </div>
  )
}
