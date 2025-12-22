'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { useDebounce } from '@/hooks/use-debounce'

export type SearchResult = {
  _id: string
  name: string
  images?: string[]
  productCode?: string
  unit?: string
  packagingUnit?: string
  packagingQuantity?: number
  itemsPerPallet?: number
  isVatPayer?: boolean
}

type AutocompleteSearchProps = {
  searchType: 'supplier' | 'product' | 'packaging'
  value: string
  initialSelectedItem?: SearchResult
  onChange: (id: string, item: SearchResult | null) => void
  placeholder?: string
}

export function AutocompleteSearch({
  searchType,
  initialSelectedItem,
  onChange,
  placeholder = 'Caută...',
}: AutocompleteSearchProps) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const debouncedValue = useDebounce(query, 300)

  useEffect(() => {
    if (initialSelectedItem?.name) {
      setQuery(initialSelectedItem.name)
    }
  }, [initialSelectedItem])

  useEffect(() => {
    // Verificăm debouncedValue în loc de query
    if (
      debouncedValue.length < 2 ||
      debouncedValue === initialSelectedItem?.name
    ) {
      setOptions([])
      return
    }

    let apiUrl = ''
    if (searchType === 'supplier') {
      // Am pus debouncedValue în URL
      apiUrl = `/api/admin/management/suppliers/search?q=${debouncedValue}`
    } else {
      // Am pus debouncedValue în URL
      apiUrl = `/api/admin/products/search?q=${debouncedValue}&type=${searchType}`
    }

    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => setOptions(data || []))
      .catch(console.error)

    // --- COD VECHI: clearTimeout a fost șters de aici ---
  }, [debouncedValue, searchType, initialSelectedItem]) // Dependența este acum debouncedValue

  const handleSelect = (item: SearchResult) => {
    setQuery(item.name)
    onChange(item._id, item)
    setIsOpen(false)
  }

  return (
    <div className='relative w-full'>
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (e.target.value === '') {
            onChange('', null)
          }
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {query && (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 text-muted-foreground'
          onClick={() => {
            setQuery('')
            onChange('', null)
            setOptions([])
          }}
        >
          &times;
        </Button>
      )}

      {isOpen && options.length > 0 && (
        <ul className='absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md p-1'>
          {options.map((item) => (
            <li
              key={item._id}
              className='cursor-pointer p-2 text-sm hover:bg-accent rounded-md'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
            >
              {/* Aici e noua structură vizuală, ca în Comenzi */}
              <div className='flex items-center gap-3'>
                {/* 1. Imaginea */}
                <HoverCard openDelay={200} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted/50 cursor-pointer'>
                      {item.images && item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.name}
                          width={40}
                          height={40}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <Package className='h-5 w-5 text-muted-foreground' />
                      )}
                    </div>
                  </HoverCardTrigger>

                  {/* Acesta este conținutul pop-up-ului */}
                  <HoverCardContent
                    side='top'
                    align='start'
                    className='w-auto p-1'
                    onPointerDownOutside={(e) => e.preventDefault()}
                  >
                    {item.images && item.images[0] ? (
                      <Image
                        src={item.images[0]}
                        alt={item.name}
                        width={250}
                        height={250}
                        className='h-60 w-60 rounded-md object-cover'
                      />
                    ) : (
                      // Fallback dacă nu există imagine
                      <div className='flex h-48 w-48 items-center justify-center rounded-md bg-muted text-muted-foreground'>
                        (Fără imagine)
                      </div>
                    )}
                  </HoverCardContent>
                </HoverCard>

                {/* 2. Nume și Cod */}
                <div className='flex flex-col'>
                  <span className='font-semibold'>{item.name}</span>
                  {searchType !== 'supplier' && (
                    <span className='text-xs text-muted-foreground'>
                      Cod produs: {item.productCode || 'N/A'}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
