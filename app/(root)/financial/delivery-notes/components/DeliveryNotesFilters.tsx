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
import { DELIVERY_NOTE_STATUS_MAP } from '@/lib/db/modules/financial/delivery-notes/delivery-note.constants'
import { X } from 'lucide-react'

export interface DeliveryNoteFiltersState {
  q?: string
  status?: string
  clientId?: string
}

interface DeliveryNotesFiltersProps {
  filters: DeliveryNoteFiltersState
  onFiltersChange: (newFilters: Partial<DeliveryNoteFiltersState>) => void
  isPending: boolean
}

export function DeliveryNotesFilters({
  filters,
  onFiltersChange,
  isPending,
}: DeliveryNotesFiltersProps) {
  return (
    <div className='flex flex-col sm:flex-row w-full items-center justify-between gap-2 mb-4'>
      <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
        {/* 1. Căutare text (Nr Aviz / Client) */}
        <Input
          placeholder='Caută Nr. Aviz / Client...'
          value={filters.q || ''}
          onChange={(e) => onFiltersChange({ q: e.target.value })}
          className='w-full sm:w-[250px]'
          disabled={isPending}
        />

        {/* 2. Filtru după Status */}
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
            {Object.entries(DELIVERY_NOTE_STATUS_MAP).map(([key, { name }]) => (
              <SelectItem key={key} value={key}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Buton Reset (apare doar dacă avem filtre active) */}
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

      {/* Aici putem pune butoane de acțiune în dreapta (ex: Export, Configurare Serie etc.) */}
      <div className='flex gap-2'>
        {/* Placeholder pentru acțiuni viitoare */}
      </div>
    </div>
  )
}
