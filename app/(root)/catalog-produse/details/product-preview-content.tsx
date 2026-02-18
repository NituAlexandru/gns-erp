'use client'

import React, { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import ProductGallery from '@/components/shared/product/product-gallery'
import { Barcode, BarcodeType } from '@/components/barcode/barcode-image'

// FOLOSIM FUNCTIA TA EXISTENTA DIN BACKEND
import { getCombinedPreviewData } from '@/lib/db/modules/product/product.actions'

import TechnicalSpecsDropdown from './technical-specs-dropdown'
import PriceHistoryList from './price-history-list'
import ProductConversionInfo from './product-conversion-info'
import ProductFinancials from './product-financials'
import ProductStockStatus from './product-stock-status'

function detectBarcodeType(_code: string): BarcodeType {
  return 'code128'
}

export default function ProductPreviewContent({
  id,
  slug,
  isAdmin,
}: {
  id: string
  slug: string
  isAdmin: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function init() {
      if (!id || !slug) return
      setLoading(true)
      try {
        // Apelăm direct funcția ta care face tot: Product/Packaging + ExtraData + History
        const res = await getCombinedPreviewData(id, slug)
        setData(res)
      } catch (err) {
        console.error('Eroare la încărcarea datelor centralizate:', err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, slug])

  if (loading)
    return (
      <div className='p-8'>
        <Skeleton className='h-[400px] w-full' />
      </div>
    )
  if (!data)
    return (
      <div className='p-8 text-center text-sm'>Produsul nu a fost găsit.</div>
    )

  const { product, packaging, extraData, priceHistory } = data

  if (product) {
    const rawCode = product.barCode || product.productCode || ''
    return (
      <ScrollArea className='h-[750px] w-full p-0'>
        <div className='flex items-center justify-between gap-2 p-0'>
          <h1 className='text-2xl font-bold'>Detalii {product.name}</h1>
        </div>
        <section className='mt-4'>
          <div className='grid grid-cols-1 lg:grid-cols-8 gap-8'>
            <div className='lg:col-span-2'>
              <ProductGallery images={product.images ?? []} />
              <div>
                <h4 className='font-bold text-lg'>Descriere</h4>
                <p className='text-muted-foreground text-xs whitespace-pre-wrap text-justify'>
                  {product.description}
                </p>
              </div>
              <div className='mt-2'>
                <Barcode
                  text={rawCode}
                  type={detectBarcodeType(rawCode)}
                  width={250}
                  height={60}
                />
              </div>
            </div>
            <div className='flex w-full flex-col gap-2 lg:col-span-6'>
              <div className='flex justify-between items-start'>
                <p className='text-xs font-small text-muted-foreground uppercase'>
                  {product.brand} • {product.category?.name}
                </p>
                <Badge variant={product.isPublished ? 'secondary' : 'outline'}>
                  {product.isPublished ? 'Publicat' : 'Ciornă'}
                </Badge>
              </div>
              <Separator className='my-2' />

              <TechnicalSpecsDropdown title='Specificații tehnice'>
                <table className='w-full text-xs'>
                  <tbody>
                    {(product.specifications || []).map(
                      (spec: string, i: number) => {
                        const [label, value] = spec
                          .split(':')
                          .map((s) => s.trim())
                        return (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? 'bg-muted/50' : ''}
                          >
                            <td className='p-2 font-semibold'>{label}</td>
                            <td className='p-2'>{value}</td>
                          </tr>
                        )
                      },
                    )}
                  </tbody>
                </table>
              </TechnicalSpecsDropdown>

              <PriceHistoryList
                title='Istoric Prețuri Vânzare'
                data={priceHistory.sales}
                availableUnits={extraData.availableUnits}
              />
              {isAdmin && (
                <PriceHistoryList
                  title='Istoric Achiziție'
                  data={priceHistory.purchases}
                  availableUnits={extraData.availableUnits}
                />
              )}

              <ProductConversionInfo units={extraData.availableUnits} />
              <ProductFinancials
                prices={extraData.calculatedPrices}
                baseCost={extraData.baseCost}
                units={extraData.availableUnits}
                compact={true}
              />
              <ProductStockStatus
                stockData={extraData.stockByLocation}
                unit={product.unit}
                units={extraData.availableUnits}
                compact={true}
              />
            </div>
          </div>
        </section>
      </ScrollArea>
    )
  }

  // --- UI PENTRU AMBALAJ ---
  if (packaging) {
    return (
      <ScrollArea className='h-[600px] w-full pr-4'>
        <h1 className='text-2xl font-bold'>Detalii {packaging.name}</h1>
        <div className='grid grid-cols-6 gap-8 mt-4'>
          <div className='col-span-2'>
            <ProductGallery images={packaging.images ?? []} />
          </div>
          <div className='col-span-4 space-y-4'>
            <PriceHistoryList
              title='Istoric Vânzări'
              data={priceHistory.sales}
            />
            {isAdmin && (
              <PriceHistoryList
                title='Istoric Achiziție'
                data={priceHistory.purchases}
              />
            )}
            <ProductFinancials
              prices={extraData.calculatedPrices}
              baseCost={extraData.baseCost}
              units={extraData.availableUnits}
              compact={true}
            />
            <ProductStockStatus
              stockData={extraData.stockByLocation}
              unit={packaging.packagingUnit}
              units={extraData.availableUnits}
            />
          </div>
        </div>
      </ScrollArea>
    )
  }

  return null
}
