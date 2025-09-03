'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type SearchResult = {
  _id: string
  name: string
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

  useEffect(() => {
    if (initialSelectedItem?.name) {
      setQuery(initialSelectedItem.name)
    }
  }, [initialSelectedItem])

  useEffect(() => {
    if (query.length < 2 || query === initialSelectedItem?.name) {
      setOptions([])
      return
    }
    const timer = setTimeout(() => {
      let apiUrl = ''
      if (searchType === 'supplier') {
        apiUrl = `/api/admin/management/suppliers/search?q=${query}`
      } else {
        apiUrl = `/api/admin/products/search?q=${query}&type=${searchType}`
      }
      fetch(apiUrl)
        .then((res) => res.json())
        .then((data) => setOptions(data || []))
        .catch(console.error)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, searchType, initialSelectedItem])

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
        <ul className='absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md'>
          {options.map((item) => (
            <li
              key={item._id}
              className='cursor-pointer px-3 py-2 text-sm hover:bg-accent'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
