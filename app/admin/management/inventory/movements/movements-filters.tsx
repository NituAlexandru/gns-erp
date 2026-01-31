'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
  STOCK_MOVEMENT_TYPES,
  MOVEMENT_TYPE_DETAILS_MAP,
} from '@/lib/db/modules/inventory/constants'
import { DateRange } from 'react-day-picker'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, parseISO, subDays } from 'date-fns'

export type MovementsFiltersState = {
  q: string
  location: string
  type: string
  dateRange: DateRange | undefined
}

export function MovementsFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const initialDateRange: DateRange | undefined =
    searchParams.get('from') && searchParams.get('to')
      ? {
          from: parseISO(searchParams.get('from')!),
          to: parseISO(searchParams.get('to')!),
        }
      : {
          from: subDays(new Date(), 30),
          to: new Date(),
        }

  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialDateRange,
  )

  const updateURL = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)

    params.set('page', '1')

    if (value && value !== 'ALL') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    replace(`${pathname}?${params.toString()}`)
  }

  // Debounce pentru Search Text (q)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (searchParams.get('q') || '')) {
        updateURL('q', searchTerm)
      }
    }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // Handler pentru Date Range
  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range)
    const params = new URLSearchParams(searchParams)
    params.set('page', '1')

    if (range?.from) {
      params.set('from', format(range.from, 'yyyy-MM-dd'))
    } else {
      params.delete('from')
    }

    if (range?.to) {
      params.set('to', format(range.to, 'yyyy-MM-dd'))
    } else {
      params.delete('to')
    }

    replace(`${pathname}?${params.toString()}`)
  }

  const handleReset = () => {
    setSearchTerm('')
    setDateRange({
      from: subDays(new Date(), 30),
      to: new Date(),
    })
    replace(pathname)
  }

  return (
    <div className='flex items-end gap-4 flex-wrap'>
      <div>
        <DatePickerWithRange date={dateRange} onDateChange={handleDateChange} />
      </div>
      <div className='flex-grow min-w-[275px]'>
        <Input
          placeholder='Cauta cod, nume produs sau furnizor...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div>
        <Select
          value={searchParams.get('location') || 'ALL'}
          onValueChange={(value) => updateURL('location', value)}
        >
          <SelectTrigger className='w-[170px]'>
            <SelectValue placeholder='Toate locațiile' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Toate locațiile</SelectItem>
            {INVENTORY_LOCATIONS.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {LOCATION_NAMES_MAP[loc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Select
          value={searchParams.get('type') || 'ALL'}
          onValueChange={(value) => updateURL('type', value)}
        >
          <SelectTrigger className='w-[170px]'>
            <SelectValue placeholder='Toate tipurile' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Toate tipurile</SelectItem>
            {STOCK_MOVEMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {MOVEMENT_TYPE_DETAILS_MAP[type].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant='outline' onClick={handleReset}>
        Resetează
      </Button>
    </div>
  )
}
