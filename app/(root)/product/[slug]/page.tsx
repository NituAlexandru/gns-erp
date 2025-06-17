import {
  getProductBySlug,
  getRelatedProductsByCategory,
} from '@/lib/actions/product.actions'
import SelectVariant from '@/components/shared/product/select-variant'
import ProductPrice from '@/components/shared/product/product-price'
import ProductGallery from '@/components/shared/product/product-gallery'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
// import { auth } from '@/auth'
import RatingSummary from '@/components/shared/product/rating-summary'
import ProductSlider from '@/components/shared/product/product-slider'
import BrowsingHistoryList from '@/components/shared/browsing-history-list'
import AddToBrowsingHistory from '@/components/shared/product/add-to-browsing-history'

export default async function ProductDetails(props: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page: string; color: string; size: string }>
}) {
  const searchParams = await props.searchParams

  const { page, color, size } = searchParams

  const params = await props.params

  const { slug } = params

  const product = await getProductBySlug(slug)

  const relatedProducts = await getRelatedProductsByCategory({
    category: product.category,
    productId: product._id,
    page: Number(page || '1'),
  })

  //   const session = await auth()

  return (
    <div>
      <AddToBrowsingHistory id={product._id} category={product.category} />
      <section>
        <div className='grid grid-cols-1 md:grid-cols-5  '>
          <div className='col-span-2'>
            <ProductGallery images={product.images} />
          </div>

          <div className='flex w-full flex-col gap-2 md:p-5 col-span-2'>
            <div className='flex flex-col gap-3'>
              <div className='flex justify-between items-center'>
                <p className='p-medium-16 bg-grey-500 text-gray-500'>
                  {product.brand} - {product.category}
                </p>{' '}
                <p className='text-sm text-gray-500'>
                  Cod produs: {product.productCode}
                </p>
              </div>
              <h1 className='font-bold text-lg lg:text-xl'>{product.name}</h1>
              <div className='flex items-center gap-2'>
                <RatingSummary
                  avgRating={product.avgRating}
                  numReviews={product.numReviews}
                  asPopover
                  ratingDistribution={product.ratingDistribution}
                />
              </div>
              <Separator />
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                <div className='flex gap-3'>
                  <ProductPrice
                    price={product.price}
                    listPrice={product.listPrice}
                    isDeal={product.tags.includes('todays-deal')}
                    forListing={false}
                  />{' '}
                </div>{' '}
              </div>
              {/* only show per-unit price if packagingQuantity > 1 */}
              {product.packagingQuantity && product.packagingQuantity > 1 && (
                <div className='flex flex-col align-center gap-3 sm:flex-row sm:items-center'>
                  <p className='text-lg'>
                    {formatCurrency(product.price / product.packagingQuantity)}{' '}
                    / {product.unit}
                  </p>
                  <span className='text-lg text-muted-foreground'>
                    TVA inclus
                  </span>
                </div>
              )}
            </div>
            <div>
              <SelectVariant
                product={product}
                size={size || product.sizes[0]}
                color={color || product.colors[0]}
              />
            </div>
            <Separator className='my-2' />{' '}
            {/* 3. Dropdown pentru specificații */}
            <div className='mb-4 relative'>
              <details className='relative mb-4'>
                <summary className='cursor-pointer font-bold py-1'>
                  Specificații tehnice
                </summary>
                <div className='absolute z-10 mt-2 overflow-auto max-h-90 border rounded shadow-sm'>
                  <table className='w-full table-fixed text-sm text-gray-700 dark:text-gray-300'>
                    <tbody>
                      {product.specifications.map((spec, i) => {
                        const [label, value] = spec
                          .split(':')
                          .map((s) => s.trim())
                        return (
                          <tr
                            key={i}
                            className={
                              i % 2 === 0
                                ? 'bg-gray-50 dark:bg-gray-800'
                                : 'bg-white dark:bg-gray-900'
                            }
                          >
                            <td className='px-4 py-2 font-semibold w-1/2'>
                              {label}
                            </td>
                            <td className='px-4 py-2'>{value}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
            <div className='flex flex-col gap-2'>
              <h4 className='p-bold-20 text-gray-500'>Descriere:</h4>
              <p className='p-medium-16 lg:p-regular-18'>
                {product.description}
              </p>
            </div>
          </div>
          <div></div>
        </div>
      </section>
      <section className='mt-10'>
        <h2 className='h2-bold mb-2' id='reviews'>
          Recenzii clienți
        </h2>
        {/* <ReviewList product={product} userId={session?.user.id} /> */}
      </section>
      <section className='mt-10'>
        <ProductSlider
          products={relatedProducts.data}
          title={`Cele mai Vândute in ${product.category}`}
        />
      </section>
      <section>
        <BrowsingHistoryList className='mt-10' />
      </section>
    </div>
  )
}
