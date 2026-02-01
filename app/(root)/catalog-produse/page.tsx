import CatalogList from './catalog-list'
import { getCatalogPage } from '@/lib/db/modules/catalog/catalog.actions'
import { getAllCategories } from '@/lib/db/modules/category/category.actions'
import {
  MANAGEMENT_ROLES,
  SUPER_ADMIN_ROLES,
} from '@/lib/db/modules/user/user-roles'
import { auth } from '@/auth'
import { ICatalogPage } from '@/lib/db/modules/catalog/types'

export const dynamic = 'force-dynamic'

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1

  const session = await auth()
  const role = session?.user?.role?.toLowerCase() || ''

  const canManageProducts = MANAGEMENT_ROLES.includes(role)
  const isAdmin = SUPER_ADMIN_ROLES.includes(role)

  // Fetch date cu filtre (q, category)
  const initialData: ICatalogPage = await getCatalogPage({
    page,
    q: params.q || '',
    category: params.category || '',
  })

  // Fetch categorii pentru filtre
  const categories = await getAllCategories()

  return (
    <CatalogList
      initialData={initialData}
      currentPage={page}
      canManageProducts={canManageProducts}
      isAdmin={isAdmin}
      allCategories={categories}
    />
  )
}
