import {
  getProductBySlug,
  getEnrichedProductData,
} from '@/lib/db/modules/product/product.actions'
import { getPackagingById } from '@/lib/db/modules/packaging-products/packaging.actions'
import type { IPackagingDoc } from '@/lib/db/modules/packaging-products/types'
import {
  PopulatedProduct,
  IProductDefaultMarkups,
} from '@/lib/db/modules/product/types'
import ERPProductView from './ERPProductView'
import PackagingView from './PackagingView'
import { getPriceHistory } from '@/lib/db/modules/price-history/price-history.actions'
import { auth } from '@/auth'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'

interface PageProps {
  params: Promise<{ id: string; slug: string }>
  searchParams: Promise<{ page?: string; color?: string; size?: string }>
}

export default async function ProductDetails({
  params,
  searchParams,
}: PageProps) {
  const { id, slug } = await params
  await searchParams

  const session = await auth()
  const userRole = session?.user?.role || ''
  const isAdmin = SUPER_ADMIN_ROLES.includes(userRole)

  let erp: PopulatedProduct | null = null
  try {
    erp = (await getProductBySlug(slug, {
      includeUnpublished: true,
    })) as unknown as PopulatedProduct
  } catch {
    erp = null
  }

  if (erp) {
    // Calculăm datele LIVE (Prețuri + Stoc)
    const markups = (erp.defaultMarkups || {}) as IProductDefaultMarkups
    const enrichedData = await getEnrichedProductData(
      erp._id.toString(),
      markups,
    )

    const priceHistoryData = await getPriceHistory({
      stockableItem: erp._id.toString(),
    })

    // Trimitem `enrichedData` ca prop nou
    return (
      <ERPProductView
        product={erp}
        extraData={enrichedData}
        priceHistory={priceHistoryData}
        isAdmin={isAdmin}
      />
    )
  }

  // 2. Încercăm să găsim Ambalaj
  let pack: IPackagingDoc | null = null
  try {
    pack = await getPackagingById(id)
  } catch {
    pack = null
  }

  if (pack && pack.slug === slug) {
    // Calculăm datele LIVE și pentru ambalaj
    const markups = (pack.defaultMarkups || {}) as IProductDefaultMarkups
    const enrichedData = await getEnrichedProductData(
      pack._id.toString(),
      markups,
    )

    const priceHistoryData = await getPriceHistory({
      stockableItem: pack._id.toString(),
    })

    return (
      <PackagingView
        packaging={pack}
        extraData={enrichedData}
        priceHistory={priceHistoryData}
        isAdmin={isAdmin}
      />
    )
  }

  return <div>Produsul nu a fost găsit.</div>
}
