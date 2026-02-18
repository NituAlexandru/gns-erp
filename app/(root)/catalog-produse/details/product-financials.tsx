import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { CalculatedPrices, AvailableUnit } from '@/lib/db/modules/product/types'

interface ProductFinancialsProps {
  prices: CalculatedPrices
  baseCost: number
  units: AvailableUnit[]
  compact?: boolean
}

export default function ProductFinancials({
  prices,
  units,
  compact = false,
}: ProductFinancialsProps) {
  const PriceBox = ({
    title,
    basePrice,
  }: {
    title: string
    basePrice: number
  }) => (
    <Card className='shadow-sm h-full flex flex-col p-2 pb-0 px-0 gap-2'>
      <CardHeader className={cn('pb-1', compact ? 'px-2 py-1' : 'px-4 py-2')}>
        <CardTitle
          className={cn(
            'font-bold text-muted-foreground uppercase tracking-wider',
            compact ? 'text-[9px]' : 'text-[10px] 2xl:text-xs',
          )}
        >
          {title}
        </CardTitle>
        <p className='text-xs font-semibold text-primary'>
          (prețurile NU conțin TVA)
        </p>
      </CardHeader>
      <CardContent
        className={cn(
          'flex-1 flex flex-col gap-1',
          compact ? 'p-2 pt-0' : 'p-4 pt-0',
        )}
      >
        {units
          .sort((a, b) => a.factor - b.factor)
          .map((unit) => {
            const finalPrice = basePrice * unit.factor
            return (
              <div
                key={unit.name}
                className={cn(
                  'flex items-baseline gap-1',
                  compact ? 'leading-tight' : '',
                )}
              >
                <span
                  className={cn(
                    'font-bold text-foreground',
                    compact ? 'text-xs' : 'text-sm 2xl:text-base',
                  )}
                >
                  {finalPrice > 0 ? formatCurrency(finalPrice) : '-'}
                </span>
                <span
                  className={cn(
                    'font-bold text-primary',
                    compact ? 'text-[10px]' : 'text-xs',
                  )}
                >
                  / {unit.name}
                </span>
              </div>
            )
          })}
      </CardContent>
    </Card>
  )

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-bold flex items-center gap-2'>
          Prețuri Vânzare
        </h3>
      </div>

      <div
        className={cn(
          'grid gap-2 items-stretch',
          compact
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        <PriceBox
          title='Livrare Directă'
          basePrice={prices.priceDirectDelivery}
        />
        <PriceBox
          title='Livrare Macara / Tir'
          basePrice={prices.priceFullTruck}
        />
        <PriceBox
          title='Comenzi mici PJ'
          basePrice={prices.priceSmallDeliveryBusiness}
        />
        <PriceBox title='Vânzare Retail' basePrice={prices.priceRetail} />
      </div>
    </div>
  )
}
