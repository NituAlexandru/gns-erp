import { auth } from '@/auth'
import SupplierList from './supplier-list'
import { getAllSuppliersForAdmin } from '@/lib/db/modules/suppliers/supplier.actions'

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const session = await auth()
  const allowedRoles = ['Administrator', 'Admin', 'Manager']

  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error(
      'Nu aveți permisiunea necesară pentru a accesa această pagină.',
    )
  }

  const resolvedParams = await searchParams
  const page = Number(resolvedParams.page) || 1
  const query = resolvedParams.q || ''

  const data = await getAllSuppliersForAdmin({ page, query })

  return <SupplierList initialData={data} currentPage={page} />
}
