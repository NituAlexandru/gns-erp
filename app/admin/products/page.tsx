'use server'

import {
  getAdminCatalogPage,
  IAdminCatalogPage,
} from '@/lib/db/modules/catalog/admin-catalog.actions'
import AdminProductsList, { CatalogShape } from './product-list'
import { ADMIN_PRODUCT_PAGE_SIZE } from '@/lib/db/modules/product/constants'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: p } = await searchParams
  const page = Number(p) || 1

  // This returns the union‐of‐products‐and‐packagings paged
  const { data, total, totalPages, from, to }: IAdminCatalogPage =
    await getAdminCatalogPage({ page, limit: ADMIN_PRODUCT_PAGE_SIZE })

  // Map *only* into the minimal shape that AdminProductsList expects
  const products: CatalogShape[] = data.map((i) => ({
    _id: i._id,
    productCode: i.productCode,
    name: i.name,
    averagePurchasePrice: i.averagePurchasePrice,
    defaultMarkups: i.defaultMarkups,
    image: i.image ?? '',
    barCode: i.barCode ?? '',
    isPublished: i.isPublished,
  }))

  return (
    <AdminProductsList
      products={products}
      currentPage={page}
      totalPages={totalPages}
      totalProducts={total}
      from={from}
      to={to}
    />
  )
}
