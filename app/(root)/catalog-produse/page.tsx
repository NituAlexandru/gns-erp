import CatalogList from './catalog-list'
import { getCatalogPage } from '@/lib/db/modules/catalog/catalog.actions'
import {
  MANAGEMENT_ROLES,
  SUPER_ADMIN_ROLES,
} from '@/lib/db/modules/user/user-roles'
import { auth } from '@/auth'
import { ICatalogPage } from '@/lib/db/modules/catalog/types'

// Pentru a te asigura că datele sunt mereu proaspete la fiecare încărcare,
// poți adăuga această linie. Este metoda corectă de a preveni caching-ul.
export const dynamic = 'force-dynamic'

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

  const initialData: ICatalogPage = await getCatalogPage({ page })

  return (
    <CatalogList
      initialData={initialData}
      currentPage={page}
      canManageProducts={canManageProducts}
      isAdmin={isAdmin}
    />
  )
}
