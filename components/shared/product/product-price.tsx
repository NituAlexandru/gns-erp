'use client'
import { cn, formatCurrency } from '@/lib/utils'

const ProductPrice = ({
  price,
  className,
  listPrice = 0,
  isDeal = false,
  forListing = true,
  plain = false,
}: {
  price: number
  isDeal?: boolean
  listPrice?: number
  className?: string
  forListing?: boolean
  plain?: boolean
}) => {
  const discountPercent = Math.round(100 - (price / listPrice) * 100)
  const formattedPrice = formatCurrency(price)
  const formattedListPrice = listPrice > 0 ? formatCurrency(listPrice) : ''
  // sparge după spaţiu non-despărţitor (NBSP)
  const [value, currency] = formattedPrice.split('\u00A0')

  return plain ? (
    formatCurrency(price)
  ) : listPrice == 0 || listPrice === price ? (
    <div className={cn('text-3xl', className)}>{formattedPrice}</div>
  ) : isDeal ? (
    <div className='space-y-2'>
      <div className='flex justify-center items-center gap-2'>
        <span className='bg-red-700 rounded-sm p-1 text-white text-sm font-semibold'>
          {discountPercent}% Reducere
        </span>
        <span className='text-red-700 text-xs font-bold'>Ofertă limitată</span>
      </div>
      <div
        className={`flex ${forListing && 'justify-center'} items-center gap-2`}
      >
        <div className={cn('flex items-start text-3xl', className)}>
          <span className='text-xs mr-1'>{currency}</span>
          <span>{value}</span>
        </div>
        <div className='text-muted-foreground text-xs py-2'>
          Preț listă: <span className='line-through'>{formattedListPrice}</span>
        </div>
      </div>
    </div>
  ) : (
    <div className=''>
      <div className='flex justify-center gap-3'>
        <div className='text-3xl text-orange-700'>-{discountPercent}%</div>
        <div className={cn('text-3xl', className)}>{formattedPrice}</div>
      </div>
      <div className='text-muted-foreground text-xs py-2'>
        Preț listă: <span className='line-through'>{formattedListPrice}</span>
      </div>
    </div>
  )
}

export default ProductPrice
