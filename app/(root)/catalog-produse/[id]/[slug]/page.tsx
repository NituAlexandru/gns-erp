import { getProductBySlug } from '@/lib/db/modules/product/product.actions'
import { getPackagingById } from '@/lib/db/modules/packaging-products/packaging.actions'
import type { IPackagingDoc } from '@/lib/db/modules/packaging-products/types'
import { PopulatedProduct } from '@/lib/db/modules/product/types'
import ERPProductView from './ERPProductView'
import PackagingView from './PackagingView'

interface PageProps {
  params: Promise<{ id: string; slug: string }>
  searchParams: Promise<{ page?: string; color?: string; size?: string }>
}

export default async function ProductDetails({
  params,
  searchParams,
}: PageProps) {
  const { id, slug } = await params
  console.log('findOne filter →', { slug, isPublished: true })

  await searchParams

  let erp: PopulatedProduct | null = null
  try {
    console.log('[DBG] Fetching product slug=', JSON.stringify(slug))
    erp = (await getProductBySlug(slug, {
      includeUnpublished: true,
    })) as unknown as PopulatedProduct
    console.log('[DBG] Found product _id=', erp._id)
  } catch {
    erp = null
  }

  if (erp) return <ERPProductView product={erp} />

  let pack: IPackagingDoc | null = null

  try {
    pack = await getPackagingById(id)
  } catch {
    pack = null
  }

  if (pack && pack.slug === slug) return <PackagingView packaging={pack} />

  return <div>Produsul nu a fost găsit.</div>
}
