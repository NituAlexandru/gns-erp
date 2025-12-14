'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SUPPLIER_ORDER_STATUSES,
  SUPPLIER_ORDER_STATUS_DETAILS,
} from '@/lib/db/modules/supplier-orders/supplier-order.constants'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formUrlQuery } from '@/lib/utils'

export interface SupplierOrderFiltersState {
  q?: string
  status?: string
}

interface SupplierOrdersFiltersProps {
  filters: SupplierOrderFiltersState
}

export function SupplierOrdersFilters({ filters }: SupplierOrdersFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [localSearch, setLocalSearch] = useState(filters.q || '')

  useEffect(() => {
    setLocalSearch(filters.q || '')
  }, [filters.q])

  // --- LOGICA CĂUTARE (URL) ---
  useEffect(() => {
    if (localSearch === (filters.q || '')) return

    const timer = setTimeout(() => {
      let newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: 'q',
        value: localSearch,
      })

      // Reset la pagina 1
      newUrl = formUrlQuery({
        params: newUrl.split('?')[1],
        key: 'page',
        value: '1',
      })

      router.push(newUrl, { scroll: false })
    }, 500)

    return () => clearTimeout(timer)
  }, [localSearch, filters.q, searchParams, router])

  // --- LOGICA STATUS (URL) ---
  const handleStatusChange = (val: string) => {
    const valueToSet = val === 'ALL' ? null : val

    let newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: 'status',
      value: valueToSet,
    })

    newUrl = formUrlQuery({
      params: newUrl.split('?')[1],
      key: 'page',
      value: '1',
    })

    router.push(newUrl, { scroll: false })
  }

  return (
    <div className='flex gap-2'>
      <Input
        placeholder='Caută după Nr. Comandă / Furnizor...'
        className='w-[250px]'
        value={localSearch}
        onChange={(e) => setLocalSearch(e.target.value)}
      />
      <Select
        value={filters.status || 'ALL'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className='w-[180px]'>
          <SelectValue placeholder='Toate statusurile' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='ALL'>Toate statusurile</SelectItem>
          {SUPPLIER_ORDER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {SUPPLIER_ORDER_STATUS_DETAILS[status].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
