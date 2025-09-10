'use client'
import React from 'react'
import { Input } from '@/components/ui/input'

interface StockSearchFilterProps {
  onSearchChange: (query: string) => void
}

export function StockSearchFilter({ onSearchChange }: StockSearchFilterProps) {
  const debounce = (func: (query: string) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (query: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func(query)
      }, delay)
    }
  }

  const debouncedSearch = debounce(onSearchChange, 700)

  return (
    <Input
      placeholder='Caută după nume sau cod produs...'
      className='max-w-sm'
      onChange={(e) => debouncedSearch(e.target.value)}
    />
  )
}
