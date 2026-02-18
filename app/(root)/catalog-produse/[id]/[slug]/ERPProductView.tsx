import ProductGallery from '@/components/shared/product/product-gallery'
import { Separator } from '@/components/ui/separator'
import {
  EnrichedProductData,
  PopulatedProduct,
} from '@/lib/db/modules/product/types'
import { Barcode, BarcodeType } from '@/components/barcode/barcode-image'
import { ProductsBackBtn } from '@/components/ui/custom/products-back-btn'
import { Badge } from '@/components/ui/badge'
import ProductFinancials from '../../details/product-financials'
import ProductStockStatus from '../../details/product-stock-status'
import ProductConversionInfo from '../../details/product-conversion-info'
import PriceHistoryList from '../../details/price-history-list'
import { IProductPriceHistory } from '@/lib/db/modules/price-history/price-history.types'
import TechnicalSpecsDropdown from '../../details/technical-specs-dropdown'

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
  extraData,
  priceHistory,
  isAdmin,
}: {
  product: PopulatedProduct
  extraData: EnrichedProductData
  priceHistory: IProductPriceHistory
  isAdmin: boolean
}) {
  const rawCode = product.barCode || product.productCode || ''
  const type = detectBarcodeType(rawCode)

  return (
    <>
      <div className='flex items-center justify-between gap-4 p-0'>
        <div className='flex items-center gap-4 mb-0'>
          <ProductsBackBtn defaultHref='/admin/products' />
          <h1 className='text-2xl font-bold'>Detalii {product.name}</h1>
        </div>
      </div>

      <section>
        <div className='grid grid-cols-1 lg:grid-cols-6 gap-8'>
          {/* Coloana Stânga - Imagini */}
          <div className='lg:col-span-2 '>
            <ProductGallery images={product.images ?? []} />{' '}
            <Barcode text={rawCode} type={type} width={250} height={60} />
          </div>

          {/* Coloana Dreapta - Informații */}
          <div className='flex w-full flex-col gap-2 lg:col-span-4'>
            {/* 1. Header Info */}
            <div>
              <div className='flex justify-between items-start'>
                <p className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
                  {product.brand} • {product.category.name}
                </p>
                <Badge variant={product.isPublished ? 'secondary' : 'outline'}>
                  {product.isPublished ? 'Publicat' : 'Ciornă'}
                </Badge>
              </div>
              <div className='flex gap-5 items-center justify-between'>
                <h2 className='font-bold text-3xl m-0'>{product.name}</h2>{' '}
                <p className='text-sm text-gray-500 font-mono'>
                  Cod intern: {product.productCode}
                </p>
              </div>
            </div>

            <Separator />
            <div>
              <TechnicalSpecsDropdown title='Specificații tehnice'>
                <table className='w-full table-fixed text-xs text-gray-700 dark:text-gray-300'>
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
              </TechnicalSpecsDropdown>

              <div className='flex flex-col mt-[-5px]'>
                {/* Istoric Vânzări - Văzut de toți */}
                <PriceHistoryList
                  title='Istoric Prețuri Vânzare'
                  data={priceHistory.sales}
                  availableUnits={extraData.availableUnits}
                />

                {/* Istoric Intrări - Doar pentru Admini */}
                {isAdmin && (
                  <PriceHistoryList
                    title='Istoric Prețuri Achiziție (Admin)'
                    data={priceHistory.purchases}
                    availableUnits={extraData.availableUnits}
                  />
                )}
              </div>
            </div>
            {/* 3. INFO CONVERSIE (Mod ambalare) */}
            <ProductConversionInfo units={extraData.availableUnits} />

            {/* 4. PREȚURI (Matricea) */}
            <ProductFinancials
              prices={extraData.calculatedPrices}
              baseCost={extraData.baseCost}
              units={extraData.availableUnits}
            />
            <Separator />
            {/* 5. STOCURI */}
            <ProductStockStatus
              stockData={extraData.stockByLocation}
              unit={product.unit}
              units={extraData.availableUnits}
            />

            {/* 6. DESCRIERE */}
            <div>
              <h4 className='font-bold text-lg'>Descriere</h4>
              <p className='text-muted-foreground leading-relaxed whitespace-pre-wrap'>
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
