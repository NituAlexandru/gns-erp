import { PRODUCT_PAGE_SIZE } from '@/lib/db/modules/product/constants'
import CatalogList from './catalog-list'
import {
  getCatalogPage,
  ICatalogPage,
} from '@/lib/db/modules/catalog/catalog.actions'
import {
  MANAGEMENT_ROLES,
  SUPER_ADMIN_ROLES,
} from '@/lib/db/modules/user/user-roles'
import { auth } from '@/auth'

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: p } = await searchParams
  const page = Number(p) || 1

  const session = await auth()
  const role = session?.user?.role?.toLowerCase() || ''

  const canManageProducts = MANAGEMENT_ROLES.includes(role)
  const isAdmin = SUPER_ADMIN_ROLES.includes(role)

  const initialData: ICatalogPage = await getCatalogPage({
    page,
    limit: PRODUCT_PAGE_SIZE,
  })

  return (
    <CatalogList
      initialData={initialData}
      currentPage={page}
      canManageProducts={canManageProducts}
      isAdmin={isAdmin}
    />
  )
}
