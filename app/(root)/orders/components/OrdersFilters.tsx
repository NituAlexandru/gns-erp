'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ORDER_STATUS_MAP } from '@/lib/db/modules/order/constants'
import { OrderFilters } from '@/lib/db/modules/order/types'

interface OrdersFiltersProps {
  filters: OrderFilters
  onFiltersChange: (newFilters: Partial<OrderFilters>) => void
  isAdmin: boolean
}

export function OrdersFilters({
  filters,
  onFiltersChange,
}: OrdersFiltersProps) {
  const totalThresholds = [
    { label: 'Peste 1.000 RON', value: 1000 },
    { label: 'Peste 5.000 RON', value: 5000 },
    { label: 'Peste 10.000 RON', value: 10000 },
    { label: 'Peste 25.000 RON', value: 25000 },
    { label: 'Peste 50.000 RON', value: 50000 },
    { label: 'Peste 100.000 RON', value: 100000 },
  ]

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {/* 1. Căutare text */}
      <Input
        placeholder='Caută după Nr. Comandă / Client...'
        value={filters.q || ''}
        onChange={(e) => onFiltersChange({ q: e.target.value })}
        className='w-full sm:w-[250px]'
      />

      {/* 2. Filtru după Status */}
      <Select
        value={filters.status || 'ALL'}
        onValueChange={(value) =>
          onFiltersChange({ status: value === 'ALL' ? undefined : value })
        }
      >
        <SelectTrigger className='w-full sm:w-[180px]'>
          <SelectValue placeholder='Toate statusurile' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='ALL'>Toate statusurile</SelectItem>
          {Object.entries(ORDER_STATUS_MAP).map(([key, { name }]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 3. Filtru după Total Comandă */}
      <Select
        value={filters.minTotal?.toString() || 'ALL'}
        onValueChange={(value) =>
          onFiltersChange({
            minTotal: value === 'ALL' ? undefined : Number(value),
          })
        }
      >
        <SelectTrigger className='w-full sm:w-[180px]'>
          <SelectValue placeholder='Total comandă' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='ALL'>Total comandă</SelectItem>
          {totalThresholds.map((t) => (
            <SelectItem key={t.value} value={t.value.toString()}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
