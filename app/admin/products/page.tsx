import { AdminProductDoc } from '@/lib/db/modules/product/types'
import { getAllProductsForAdmin } from '@/lib/db/modules/product/product.actions'
import AdminProductsList from './product-list'
import { ADMIN_PRODUCT_PAGE_SIZE } from '@/lib/db/modules/product/constants'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: p } = await searchParams
  const page = Number(p) || 1

  // 1) fetch
  const {
    products: rawProducts,
    totalPages,
    totalProducts,
    from,
    to,
  } = await getAllProductsForAdmin({
    query: '',
    page,
    limit: ADMIN_PRODUCT_PAGE_SIZE,
  })

  // 2) map la AdminProductDoc[]
  const products: AdminProductDoc[] = rawProducts.map((p) => ({
    ...p,
    image: p.images[0] ?? '',
    barCode: p.barCode ?? '',
  }))

  return (
    <AdminProductsList
      products={products}
      currentPage={page}
      totalPages={totalPages}
      totalProducts={totalProducts}
      from={from}
      to={to}
    />
  )
}
