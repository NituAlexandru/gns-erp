import React from 'react'
import ProductPrice from '@/components/shared/product/product-price'
import ProductGallery from '@/components/shared/product/product-gallery'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { PopulatedProduct } from '@/lib/db/modules/product/types'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Barcode, BarcodeType } from '@/components/barcode/barcode-image'
import { Button } from '@/components/ui/button'
import { computeSalePrices } from '@/lib/db/modules/product/utils'

//eslint-disable-next-line
function detectBarcodeType(_code: string): BarcodeType {
  // if (/^\d{13}$/.test(code)) return 'ean13'
  // if (/^\d{12}$/.test(code)) return 'upca'
  // if (/^\d{14}$/.test(code)) return 'itf14'
  // // GS1-128 folosește paranteze AIs, ex "(01)..."
  // if (/^\(\d+\)/.test(code)) return 'gs1128'
  // fallback alfanumeric/general
  return 'code128'
}

export default function ERPProductView({
  product,
}: {
  product: PopulatedProduct
}) {
  const rawCode = product.barCode || product.productCode || ''
  const type = detectBarcodeType(rawCode)

  const sale = computeSalePrices(
    product.averagePurchasePrice,
    product.defaultMarkups
  )

  return (
    <>
      <div className='flex items-center justify-between gap-4 px-6'>
        <div className='flex items-center gap-4 mb-5'>
          <Button asChild variant='outline'>
            <Link href='/catalog-produse'>
              <ChevronLeft /> Înapoi
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>Detalii {product.name}</h1>
        </div>
        <div className='my-2'>
          <Barcode text={rawCode} type={type} width={300} height={100} />
        </div>
      </div>
      <section>
        <div className='grid grid-cols-1 md:grid-cols-5'>
          <div className='col-span-2'>
            <ProductGallery images={product.images ?? []} />
          </div>
          <div className='flex w-full flex-col gap-2 md:p-5 col-span-3'>
            {/* HEADER */}
            <div className='flex flex-col gap-3'>
              <div className='flex justify-between items-center'>
                <p className='p-medium-16 text-gray-500'>
                  {product.brand} – {product.category.name} –{' '}
                  {product.mainCategory.name}
                </p>
                <p className='text-sm text-gray-500'>
                  Cod produs: {product.productCode}
                </p>
              </div>
              <h1 className='font-bold text-lg lg:text-xl'>{product.name}</h1>
              <Separator />
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                <ProductPrice price={sale.retailPrice} forListing={false} />
              </div>
              {product.packagingQuantity! > 1 && (
                <div className='flex items-center gap-3'>
                  <p className='text-lg'>
                    {formatCurrency(
                      sale.retailPrice / product.packagingQuantity!
                    )}{' '}
                    / {product.unit}
                  </p>
                  <span className='text-lg text-muted-foreground'>
                    TVA inclus
                  </span>
                </div>
              )}
            </div>

            <Separator className='my-2' />

            {/* Specificații */}
            <details className='relative mb-4'>
              <summary className='cursor-pointer font-bold py-1'>
                Specificații tehnice
              </summary>
              <div className='absolute z-10 mt-2 overflow-auto max-h-90 border rounded shadow-sm bg-background'>
                <table className='w-full table-fixed text-sm text-gray-700 dark:text-gray-300'>
                  <tbody>
                    {(product.specifications || []).map((spec, i) => {
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

            {/* Descriere */}
            <div className='flex flex-col gap-2'>
              <h4 className='font-bold text-gray-500'>Descriere:</h4>
              <p className='text-base'>{product.description}</p>
            </div>

            <Separator className='my-4' />

            {/* Date brute */}
            <div>
              <h4 className='font-bold text-lg text-gray-700'>
                Date brute complete
              </h4>
              <div className='text-xs mt-2 space-y-1 font-mono'>
                <p>_id: {product._id}</p>
                <p>name: {product.name}</p>
                <p>slug: {product.slug}</p>
                <p>category (raw): {product.category._id}</p>
                <p>mainCategory (raw): {product.mainCategory._id}</p>
                <p>barCode: {product.barCode ?? '-'}</p>
                <p>productCode: {product.productCode}</p>
                <div>
                  <p>images:</p>
                  {(product.images || []).map((img, idx) => (
                    <p key={idx} className='ml-4'>
                      {img}
                    </p>
                  ))}
                </div>
                <p>description: {product.description}</p>
                <p>brand: {product.brand}</p>
                <p>averagePurchasePrice: {product.averagePurchasePrice}</p>
                <p>directDeliveryPrice: {sale.directPrice.toFixed(2)}</p>
                <p>fullTruckPrice: {sale.fullTruckPrice.toFixed(2)}</p>
                <p>
                  smallDeliveryBusinessPrice: {sale.smallBizPrice.toFixed(2)}
                </p>
                <p>retailPrice: {sale.retailPrice.toFixed(2)}</p>
                <p>minStock: {product.minStock}</p>
                <p>countInStock: {product.countInStock}</p>
                <p>
                  firstOrderDate:{' '}
                  {product.firstOrderDate
                    ? product.firstOrderDate.toLocaleDateString()
                    : '-'}
                </p>
                <p>
                  lastOrderDate:{' '}
                  {product.lastOrderDate
                    ? product.lastOrderDate.toLocaleDateString()
                    : '-'}
                </p>
                <p>numSales: {product.numSales}</p>
                <p>unit: {product.unit}</p>
                <p>packagingUnit: {product.packagingUnit}</p>
                <p>packagingQuantity: {product.packagingQuantity}</p>
                <p>length: {product.length}</p>
                <p>width: {product.width}</p>
                <p>height: {product.height}</p>
                <p>volume: {product.volume}</p>
                <p>weight: {product.weight}</p>
                <p>palletTypeId: {product.palletTypeId ?? '-'}</p>
                <p>itemsPerPallet: {product.itemsPerPallet}</p>
                <p>isPublished: {product.isPublished ? 'Da' : 'Nu'}</p>
                <p>createdAt: {product.createdAt.toLocaleString()}</p>
                <p>updatedAt: {product.updatedAt.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
