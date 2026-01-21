'use client'

import { Input } from '@/components/ui/input'
import { InvoiceFilters } from '@/lib/db/modules/financial/invoices/invoice.types'

interface ProformasFiltersProps {
  filters: InvoiceFilters
  onFiltersChange: (newFilters: Partial<InvoiceFilters>) => void
}

export function ProformasFilters({
  filters,
  onFiltersChange,
}: ProformasFiltersProps) {
  return (
    <div className='flex flex-between w-full items-center gap-2'>
      <div className='flex gap-2 '>
        {/* Căutare text */}
        <Input
          placeholder='Caută Nr. Proformă / Client...'
          value={filters.q || ''}
          onChange={(e) => onFiltersChange({ q: e.target.value })}
          className='w-full sm:w-[250px]'
        />
      </div>
    </div>
  )
}
