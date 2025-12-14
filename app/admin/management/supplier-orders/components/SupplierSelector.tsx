'use client'

import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import {
  AutocompleteSearch,
  SearchResult,
} from '../../reception/autocomplete-search'

interface SupplierSelectorProps {
  selectedSupplierId: string
  initialSupplierData?: SearchResult
  onSelect: (id: string, data: SearchResult | null) => void
  readOnly?: boolean
}

export function SupplierSelector({
  selectedSupplierId,
  initialSupplierData,
  onSelect,
  readOnly = false,
}: SupplierSelectorProps) {
  return (
    <Card className='py-2'>
      <CardHeader className='pb-0'>
        <CardTitle className='text-md flex items-center gap-2'>
          <Building2 className='h-4 w-4' />
          Furnizor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {readOnly ? (
          <div className='text-sm font-medium'>
            {initialSupplierData?.name || 'Furnizor necunoscut'}
          </div>
        ) : (
          <div className='space-y-2'>
            <Label>Caută Furnizor</Label>
            <AutocompleteSearch
              searchType='supplier'
              value={selectedSupplierId}
              initialSelectedItem={initialSupplierData}
              onChange={onSelect}
              placeholder='CUI sau Nume...'
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
