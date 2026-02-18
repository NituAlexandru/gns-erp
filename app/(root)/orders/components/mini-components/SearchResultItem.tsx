'use client'

import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchedProduct } from '@/lib/db/modules/product/types'
import { useUnitConversion } from '@/hooks/use-unit-conversion'
import ProductPreviewContent from '@/app/(root)/catalog-produse/details/product-preview-content'
import { toSlug } from '@/lib/utils'

type SearchResultItemProps = {
  item: SearchedProduct
  isAdmin: boolean
}

export function SearchResultItem({ item, isAdmin }: SearchResultItemProps) {
  const {
    selectedUnit,
    handleUnitChange,
    allUnits,
    convertedStock: convertedAvailableStock,
  } = useUnitConversion({
    item,
    baseStock: item.availableStock,
  })

  const conversionFactor =
    allUnits.find((u) => u.unitName === selectedUnit)?.baseUnitEquivalent ?? 1
  const convertedTotalStock = item.totalStock / conversionFactor
  const convertedTotalReserved = item.totalReserved / conversionFactor

  return (
    <div className='flex items-center gap-4 w-full'>
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className='cursor-pointer'>
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                width={80}
                height={80}
                className='rounded-md object-cover hover:opacity-80 transition-opacity'
              />
            ) : (
              <div className='h-20 w-20 rounded-md bg-secondary flex items-center justify-center text-muted-foreground text-xs'>
                Fără poză
              </div>
            )}
          </div>
        </HoverCardTrigger>

        <HoverCardContent
          side='right'
          align='start'
          sideOffset={10}
          collisionPadding={16}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className='z-[100] w-[calc(100vw-2rem)] max-w-[1100px] p-0 border-2 border-border shadow-2xl bg-background overflow-hidden text-left'
        >
          {/* Header Card */}
          <div className='bg-muted/50 p-4 border-b flex justify-between items-center'>
            <span className='font-bold text-xs lg:text-sm uppercase truncate mr-4'>
              {item.name}
            </span>
            <Badge
              variant='outline'
              className='hidden sm:block font-mono text-[10px]'
            >
              {item.productCode}
            </Badge>
          </div>

          {/* Body Card (Scrollabil) */}
          <div className='p-4 lg:p-6 max-h-[85vh] overflow-y-auto bg-background'>
            <ProductPreviewContent
              id={item._id}
              slug={toSlug(item.name)}
              isAdmin={isAdmin}
            />
          </div>
        </HoverCardContent>
      </HoverCard>

      <div>
        <div className='flex items-center gap-2'>
          <p className='font-semibold'>{item.name}</p>
          {item.itemType === 'Ambalaj' && (
            <Badge variant='secondary'>Ambalaj</Badge>
          )}
        </div>
        <div className='text-xs text-muted-foreground mt-1'>
          <span>Cod: {item.productCode} |</span>
          <span>
            {' '}
            Stoc Total:{' '}
            <span className='font-bold'>{convertedTotalStock.toFixed(2)}</span>
          </span>
          <span>
            {' '}
            | Rezervat:{' '}
            <span className='font-bold text-orange-500'>
              {convertedTotalReserved.toFixed(2)}
            </span>
          </span>
          <span>
            {' '}
            | Disponibil:
            <span
              className={`font-bold ${item.availableStock >= 0 ? 'text-primary' : 'text-destructive'}`}
            >
              {convertedAvailableStock.toFixed(2)}
            </span>
          </span>
          {allUnits.length > 1 ? (
            <Select onValueChange={handleUnitChange} value={selectedUnit}>
              <SelectTrigger className='inline-flex h-6 px-2 ml-2 w-auto border-dashed'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allUnits.map((u) => (
                  <SelectItem key={u.unitName} value={u.unitName}>
                    {u.unitName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className='ml-1'>{selectedUnit}</span>
          )}
        </div>
      </div>
    </div>
  )
}
