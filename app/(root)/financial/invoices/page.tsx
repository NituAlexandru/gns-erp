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
    <div className='flex flex-col gap-0'>
      <h1 className='text-2xl font-bold tracking-tight hidden'>
        Lista Facturi
      </h1>
      {/* Componenta Client care se ocupă de paginare și filtrare */}
      <InvoicesList
        initialData={initialData}
        currentPage={page}
        isAdmin={isAdmin}
      />
    </div>
  )
}
