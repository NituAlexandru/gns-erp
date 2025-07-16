import React from 'react'
import ProductPrice from '@/components/shared/product/product-price'
import ProductGallery from '@/components/shared/product/product-gallery'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import type { IPackagingDoc } from '@/lib/db/modules/packaging-products/types'
import { Barcode, BarcodeType } from '@/components/barcode/barcode-image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { computeSalePrices } from '@/lib/db/modules/product/utils' // ← import helper

function detectBarcodeType(code: string): BarcodeType {
  if (/^\d{13}$/.test(code)) return 'ean13'
  if (/^\d{12}$/.test(code)) return 'upca'
  if (/^\d{14}$/.test(code)) return 'itf14'
  if (/^\(\d+\)/.test(code)) return 'gs1128'
  return 'code128'
}

export default function PackagingView({
  packaging,
}: {
  packaging: IPackagingDoc
}) {
  const rawCode = packaging.productCode || packaging._id
  const type = detectBarcodeType(rawCode)

  // ——— Compute sale prices from averagePurchasePrice + defaultMarkups
  const sale = computeSalePrices(
    packaging.averagePurchasePrice,
    packaging.defaultMarkups
  )

  return (
    <>
      <div className='flex items-center justify-between gap-4 px-6 mb-4'>
        <div className='flex items-center gap-4'>
          <Button asChild variant='outline'>
            <Link href='/catalog-produse'>
              <ChevronLeft /> Înapoi
            </Link>
          </Button>
          <h1 className='text-2xl font-bold'>Detalii {packaging.name}</h1>
        </div>
        <div>
          <Barcode text={rawCode} type={type} width={300} height={100} />
        </div>
      </div>
      <section>
        <div className='grid grid-cols-1 md:grid-cols-5'>
          {/* gallery */}
          <div className='col-span-2'>
            <ProductGallery images={packaging.images ?? []} />
          </div>

          {/* details */}
          <div className='flex w-full flex-col gap-2 md:p-5 col-span-3'>
            {/* Header */}
            <div className='flex flex-col gap-3'>
              <div className='flex justify-between items-center'>
                <p className='p-medium-16 text-gray-500'>{packaging.slug}</p>
                <p className='text-sm text-gray-500'>
                  Cod produs: {packaging.productCode}
                </p>
              </div>
              <h1 className='font-bold text-lg lg:text-xl'>{packaging.name}</h1>
              <Separator />
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                <ProductPrice price={sale.retailPrice} forListing={false} />
              </div>
              {packaging.packagingQuantity! > 1 && (
                <div className='flex items-center gap-3'>
                  <p className='text-lg'>
                    {formatCurrency(
                      sale.retailPrice / packaging.packagingQuantity!
                    )}{' '}
                    / {packaging.packagingUnit}
                  </p>
                  <span className='text-lg text-muted-foreground'>
                    TVA inclus
                  </span>
                </div>
              )}
            </div>

            <Separator className='my-2' />
            {/* Descriere */}
            {packaging.description && (
              <div className='flex flex-col gap-2'>
                <h4 className='font-bold text-gray-500'>Descriere:</h4>
                <p className='text-base'>{packaging.description}</p>
              </div>
            )}

            <Separator className='my-4' />

            {/* Detalii brute */}
            <div>
              <h4 className='font-bold text-lg text-gray-700'>
                Date brute ambalaj
              </h4>
              <div className='text-xs mt-2 space-y-1 font-mono'>
                <p>_id: {packaging._id}</p>
                <p>slug: {packaging.slug}</p>
                <p>name: {packaging.name}</p>
                <p>supplier: {String(packaging.supplier)}</p>
                <p>mainCategory: {String(packaging.mainCategory)}</p>
                <p>countInStock: {packaging.countInStock}</p>
                <p>
                  images:
                  {(packaging.images ?? []).map((img, i) => (
                    <span key={i} className='block ml-4'>
                      {img}
                    </span>
                  ))}
                </p>

                <p>entryPrice: {(packaging.entryPrice ?? 0).toFixed(2)}</p>
                <p>listPrice: {(packaging.listPrice ?? 0).toFixed(2)}</p>
                <p>directDeliveryPrice: {sale.directPrice.toFixed(2)}</p>
                <p>fullTruckPrice: {sale.fullTruckPrice.toFixed(2)}</p>
                <p>
                  smallDeliveryBusinessPrice: {sale.smallBizPrice.toFixed(2)}
                </p>
                <p>retailPrice: {sale.retailPrice.toFixed(2)}</p>
                <p>
                  averagePurchasePrice:{' '}
                  {(packaging.averagePurchasePrice ?? 0).toFixed(2)}
                </p>

                <p>packagingQuantity: {packaging.packagingQuantity}</p>
                <p>packagingUnit: {packaging.packagingUnit}</p>
                <p>productCode: {packaging.productCode}</p>
                <p>isPublished: {packaging.isPublished ? 'Da' : 'Nu'}</p>
                <p>length: {packaging.length}</p>
                <p>width: {packaging.width}</p>
                <p>height: {packaging.height}</p>
                <p>volume: {packaging.volume}</p>
                <p>weight: {packaging.weight}</p>
                <p>
                  createdAt: {new Date(packaging.createdAt).toLocaleString()}
                </p>
                <p>
                  updatedAt: {new Date(packaging.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
