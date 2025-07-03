import { auth } from '@/auth'
import SupplierList from './supplier-list'
import { getAllSuppliersForAdmin } from '@/lib/db/modules/suppliers'

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (session?.user.role !== 'Admin') {
    throw new Error('Permisiune Admin necesară')
  }

  // aștepți rezolvarea lui searchParams înainte de a citi .page
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const data = await getAllSuppliersForAdmin({ page })
  return <SupplierList initialData={data} currentPage={page} />
}
