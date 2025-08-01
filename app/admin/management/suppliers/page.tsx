import { auth } from '@/auth'
import SupplierList from './supplier-list'
import { getAllSuppliersForAdmin } from '@/lib/db/modules/suppliers'

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  const allowedRoles = ['Administrator', 'Admin', 'Manager']
  if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {
    throw new Error(
      'Nu aveți permisiunea necesară pentru a accesa această pagină.'
    )
  }

  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const data = await getAllSuppliersForAdmin({ page })
  return <SupplierList initialData={data} currentPage={page} />
}
