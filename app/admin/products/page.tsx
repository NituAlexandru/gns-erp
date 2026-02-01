'use server'

import { getAdminCatalogPage } from '@/lib/db/modules/catalog/admin-catalog.actions'
import { getAllCategories } from '@/lib/db/modules/category/category.actions' // Importă acțiunea ta
import { IAdminCatalogItem } from '@/lib/db/modules/catalog/types'
import AdminProductsList from './product-list'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    q?: string
    supplier?: string
    category?: string
  }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1

  // Fetch date cu filtre
  const { data, total, totalPages, from, to } = await getAdminCatalogPage({
    page,
    q: params.q || '',
    category: params.category || '',
  })

  // Fetch categorii pentru UI
  const categories = await getAllCategories()

  return (
    <AdminProductsList
      products={data as IAdminCatalogItem[]}
      currentPage={page}
      totalPages={totalPages}
      totalProducts={total}
      from={from}
      to={to}
      allCategories={categories}
    />
  )
}
