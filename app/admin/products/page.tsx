'use server'

import { getAdminCatalogPage } from '@/lib/db/modules/catalog/admin-catalog.actions'
import { IAdminCatalogItem } from '@/lib/db/modules/catalog/types'
import AdminProductsList from './product-list'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: p } = await searchParams
  const page = Number(p) || 1

  const { data, total, totalPages, from, to } = await getAdminCatalogPage({
    page,
  })

  return (
    <AdminProductsList
      products={data as IAdminCatalogItem[]}
      currentPage={page}
      totalPages={totalPages}
      totalProducts={total}
      from={from}
      to={to}
    />
  )
}
