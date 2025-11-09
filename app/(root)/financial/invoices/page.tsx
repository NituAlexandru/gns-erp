
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { getAllInvoices } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { InvoicesList } from './components/InvoicesList'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const session = await auth()

  const userRole = session?.user?.role || 'user'
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole.toLowerCase())

  // Preluăm datele inițiale pe server
  const initialData = await getAllInvoices(page)

  return (
    <div className='flex flex-col gap-2'>
      {/* Header: Titlu + Buton Creare */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold tracking-tight'>Facturi</h1>
        <Button asChild>
          <Link href='/financial/invoices/new'>
            <PlusCircle className='w-4 h-4 mr-2' />
            Creează Factură
          </Link>
        </Button>
      </div>

      {/* Componenta Client care se ocupă de paginare și filtrare */}
      <InvoicesList
        initialData={initialData}
        currentPage={page}
        isAdmin={isAdmin}
      />
    </div>
  )
}
