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

type SearchResultItemProps = {
  item: SearchedProduct
}

export function SearchResultItem({ item }: SearchResultItemProps) {
  const { selectedUnit, handleUnitChange, allUnits, convertedStock } =
    useUnitConversion({
      item,
      baseStock: item.totalStock,
    })

  return (
    <div className='flex items-center gap-4 w-full'>
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className='cursor-pointer'>
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                width={80}
                height={80}
                className='rounded-md object-cover'
              />
            ) : (
              <div className='h-20 w-20 rounded-md bg-secondary flex items-center justify-center text-muted-foreground'>
                ?
              </div>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent className='w-80'>
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              width={320}
              height={320}
              className='rounded-lg object-cover'
            />
          ) : (
            <p>Imagine indisponibilă</p>
          )}
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
          <span>{item.productCode} | Stoc: </span>
          <span className='font-bold text-primary'>
            {convertedStock.toFixed(2)}
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
