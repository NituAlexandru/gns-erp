'use client'

import React, { useState, useEffect } from 'react'
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

export type MovementsFiltersState = {
  q: string
  location: string
  type: string
  dateRange: DateRange | undefined
}

interface MovementsFiltersProps {
  initialState: MovementsFiltersState
  onFilterChange: (filters: MovementsFiltersState) => void
}

export function MovementsFilters({
  initialState,
  onFilterChange,
}: MovementsFiltersProps) {
  const [filters, setFilters] = useState(initialState)

  const handleUpdate = <K extends keyof MovementsFiltersState>(
    key: K,
    value: MovementsFiltersState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleReset = () => {
    const resetState = {
      ...filters,
      q: '',
      location: 'ALL',
      type: 'ALL',
    }
    setFilters(resetState)
    onFilterChange(resetState)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange(filters)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters, onFilterChange])

  return (
    <div className='flex items-end gap-4 pb-4'>
      <div>
        <DatePickerWithRange
          date={filters.dateRange}
          onDateChange={(newDate) => handleUpdate('dateRange', newDate)}
        />
      </div>
      <div className='flex-grow min-w-[250px]'>
        <Input
          placeholder='Cauta nume produs sau furnizor'
          value={filters.q}
          onChange={(e) => handleUpdate('q', e.target.value)}
        />
      </div>
      <div>
        <Select
          value={filters.location}
          onValueChange={(value) => handleUpdate('location', value)}
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
          value={filters.type}
          onValueChange={(value) => handleUpdate('type', value)}
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
