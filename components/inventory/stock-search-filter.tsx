'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Input } from '@/components/ui/input'

interface StockSearchFilterProps {
  onSearchChange: (query: string) => void
  defaultValue?: string
}

export function StockSearchFilter({
  onSearchChange,
  defaultValue = '',
}: StockSearchFilterProps) {
  const [value, setValue] = useState(defaultValue)
  const callbackRef = useRef(onSearchChange)

  useEffect(() => {
    callbackRef.current = onSearchChange
  }, [onSearchChange])

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout

    return (query: string) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        callbackRef.current(query)
      }, 500)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValue(val)
    debouncedSearch(val)
  }

  return (
    <Input
      placeholder='Caută după cod, nume produs sau furnizor...'
      className='max-w-sm'
      value={value}
      onChange={handleChange}
    />
  )
}
