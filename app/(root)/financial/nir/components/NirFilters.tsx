'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NIR_STATUS_MAP } from '@/lib/db/modules/financial/nir/nir.constants'
import { X } from 'lucide-react'

export interface NirFiltersState {
  q?: string
  status?: string
}

interface NirFiltersProps {
  filters: NirFiltersState
  onFiltersChange: (newFilters: Partial<NirFiltersState>) => void
  isPending: boolean
}

export function NirFilters({
  filters,
  onFiltersChange,
  isPending,
}: NirFiltersProps) {
  return (
    <div className='flex flex-col sm:flex-row w-full items-center justify-between gap-2 mb-4'>
      <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
        {/* Căutare */}
        <Input
          placeholder='Caută Nr. NIR / Furnizor...'
          value={filters.q || ''}
          onChange={(e) => onFiltersChange({ q: e.target.value })}
          className='w-full sm:w-[250px]'
          disabled={isPending}
        />

        {/* Filtru Status */}
        <Select
          value={filters.status || 'ALL'}
          onValueChange={(value) =>
            onFiltersChange({ status: value === 'ALL' ? undefined : value })
          }
          disabled={isPending}
        >
          <SelectTrigger className='w-full sm:w-[180px]'>
            <SelectValue placeholder='Toate statusurile' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ALL'>Toate statusurile</SelectItem>
            {Object.entries(NIR_STATUS_MAP).map(([key, { name }]) => (
              <SelectItem key={key} value={key}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Buton Reset */}
        {(filters.q || filters.status) && (
          <Button
            variant='ghost'
            onClick={() => onFiltersChange({ q: '', status: undefined })}
            className='px-2 lg:px-3'
            title='Resetează filtrele'
          >
            <X className='h-4 w-4 mr-2' />
            Resetează
          </Button>
        )}
      </div>
    </div>
  )
}
