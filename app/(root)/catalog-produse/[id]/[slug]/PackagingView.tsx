import ProductGallery from '@/components/shared/product/product-gallery'
import { Separator } from '@/components/ui/separator'
import type { IPackagingDoc } from '@/lib/db/modules/packaging-products/types'
import { Barcode, BarcodeType } from '@/components/barcode/barcode-image'
import { EnrichedProductData } from '@/lib/db/modules/product/types'
import ProductFinancials from '../../details/product-financials'
import ProductStockStatus from '../../details/product-stock-status'
import ProductConversionInfo from '../../details/product-conversion-info'
import { Badge } from '@/components/ui/badge'
import BackButton from '@/components/shared/back-button'
import PriceHistoryList from '../../details/price-history-list'
import { IProductPriceHistory } from '@/lib/db/modules/price-history/price-history.types'
import TechnicalSpecsDropdown from '../../details/technical-specs-dropdown'

// eslint-disable-next-line
function detectBarcodeType(_code: string): BarcodeType {
  return 'code128'
}

export default function PackagingView({
  packaging,
  extraData,
  priceHistory,
  isAdmin,
}: {
  packaging: IPackagingDoc
  extraData: EnrichedProductData
  priceHistory: IProductPriceHistory
  isAdmin: boolean
}) {
  const rawCode = packaging.productCode || packaging._id
  const type = detectBarcodeType(rawCode)

  return (
    <>
      <div className='flex items-center justify-between gap-4 p-0 mb-0'>
        <div className='flex items-center gap-4'>
          <BackButton />
          <h1 className='text-2xl font-bold'>Detalii {packaging.name}</h1>
        </div>
      </div>

      <section>
        <div className='grid grid-cols-1 lg:grid-cols-6 gap-8'>
          {/* Coloana Stânga - Imagini */}
          <div className='lg:col-span-2'>
            <ProductGallery images={packaging.images ?? []} />
            <Barcode text={rawCode} type={type} width={250} height={60} />
          </div>

          {/* Coloana Dreapta - Informații */}
          <div className='flex w-full flex-col gap-5 lg:col-span-4'>
            {/* 1. Header Info */}
            <div>
              <div className='flex justify-between items-start'>
                <p className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
                  Ambalaj
                </p>
                <p className='text-sm text-gray-500 font-mono mt-1'>
                  Cod produs: {packaging.productCode}
                </p>
                <Badge
                  variant={packaging.isPublished ? 'secondary' : 'outline'}
                >
                  {packaging.isPublished ? 'Publicat' : 'Ciornă'}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* 2. SPECIFICAȚII TEHNICE (Stil tabelar identic cu Produsele) */}

            <div>
              <TechnicalSpecsDropdown title='Specificații tehnice'>
                <table className='w-full table-fixed text-xs text-gray-700 dark:text-gray-300'>
                  <tbody>
                    {/* Dimensiuni */}
                    <tr className='bg-gray-50 dark:bg-gray-800'>
                      <td className='px-4 py-2 font-semibold w-1/2'>
                        Dimensiuni (L x l x h)
                      </td>
                      <td className='px-4 py-2'>
                        {packaging.length} x {packaging.width} x{' '}
                        {packaging.height} cm
                      </td>
                    </tr>
                    {/* Greutate */}
                    <tr className='bg-white dark:bg-gray-900'>
                      <td className='px-4 py-2 font-semibold w-1/2'>
                        Greutate
                      </td>
                      <td className='px-4 py-2'>{packaging.weight} kg</td>
                    </tr>
                    {/* Volum */}
                    <tr className='bg-gray-50 dark:bg-gray-800'>
                      <td className='px-4 py-2 font-semibold w-1/2'>Volum</td>
                      <td className='px-4 py-2'>{packaging.volume} m³</td>
                    </tr>
                    {/* Unitate Ambalare */}
                    <tr className='bg-white dark:bg-gray-900'>
                      <td className='px-4 py-2 font-semibold w-1/2'>
                        Tip Unitate
                      </td>
                      <td className='px-4 py-2'>
                        {packaging.packagingUnit || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </TechnicalSpecsDropdown>
              <div className='flex flex-col gap-2'>
                {/* Istoric Vânzări - Văzut de toți */}
                <PriceHistoryList
                  title='Istoric Prețuri Vânzare'
                  data={priceHistory.sales}
                />

                {/* Istoric Intrări - Doar pentru Admini */}
                {isAdmin && (
                  <PriceHistoryList
                    title='Istoric Prețuri Achiziție (Admin)'
                    data={priceHistory.purchases}
                  />
                )}
              </div>
            </div>
            {/* 3. INFO CONVERSIE */}
            <ProductConversionInfo units={extraData.availableUnits} />

            {/* 4. PREȚURI (Matricea) */}
            <ProductFinancials
              prices={extraData.calculatedPrices}
              baseCost={extraData.baseCost}
              units={extraData.availableUnits}
            />

            {/* 5. STOCURI */}
            <ProductStockStatus
              stockData={extraData.stockByLocation}
              unit={packaging.packagingUnit}
              units={extraData.availableUnits}
            />

            <Separator />

            {/* 6. DESCRIERE */}
            {packaging.description && (
              <div>
                <h4 className='font-bold text-lg mb-2'>Descriere</h4>
                <p className='text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                  {packaging.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
