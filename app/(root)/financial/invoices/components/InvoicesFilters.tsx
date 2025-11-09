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
  EFACTURA_STATUS_MAP,
  INVOICE_STATUS_MAP,
} from '@/lib/db/modules/financial/invoices/invoice.constants'
import { InvoiceFilters } from '@/lib/db/modules/financial/invoices/invoice.types'

interface InvoicesFiltersProps {
  filters: InvoiceFilters
  onFiltersChange: (newFilters: Partial<InvoiceFilters>) => void
  // TODO: Adaugă prop-uri pentru admini, agenți etc. dacă e nevoie
}

export function InvoicesFilters({
  filters,
  onFiltersChange,
}: InvoicesFiltersProps) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {/* 1. Căutare text */}
      <Input
        placeholder='Caută Nr. Factură / Client...'
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
          {Object.entries(INVOICE_STATUS_MAP).map(([key, { name }]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 3. Filtru după Status eFactura */}
      <Select
        value={filters.eFacturaStatus || 'ALL'}
        onValueChange={(value) =>
          onFiltersChange({
            eFacturaStatus: value === 'ALL' ? undefined : value,
          })
        }
      >
        <SelectTrigger className='w-full sm:w-[180px]'>
          <SelectValue placeholder='Status eFactura' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='ALL'>Status eFactura</SelectItem>
          {Object.entries(EFACTURA_STATUS_MAP).map(([key, { name }]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
