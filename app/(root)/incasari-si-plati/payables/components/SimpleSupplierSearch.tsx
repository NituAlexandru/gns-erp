'use client'

import * as React from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { Button } from '@/components/ui/button'

interface SimpleSupplierSearchProps {
  suppliers: ISupplierDoc[]
  value: string
  onChange: (value: string) => void
}

export function SimpleSupplierSearch({
  suppliers,
  value,
  onChange,
}: SimpleSupplierSearchProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isFocused, setIsFocused] = React.useState(false)

  const selectedSupplier = React.useMemo(
    () => suppliers.find((s) => s._id === value),
    [suppliers, value]
  )
  const selectedSupplierName = selectedSupplier?.name || ''

  const displayValue = isFocused ? searchTerm : selectedSupplierName

  const filteredSuppliers = React.useMemo(() => {
    // În modul de afișare, arătăm doar 5 rezultate bazate pe căutare
    if (!searchTerm) return []
    return suppliers
      .filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.fiscalCode?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 5)
  }, [searchTerm, suppliers])

  const handleSelect = (supplierId: string) => {
    onChange(supplierId)
    setSearchTerm('')
    setIsFocused(false)
  }

  const handleClear = () => {
    onChange('')
    setSearchTerm('')
    setIsFocused(true)
  }

  return (
    <div className='relative w-full space-y-1'>
      <div className='relative flex'>
        {/* Inputul care afișează numele selectat SAU termenul de căutare */}
        <Input
          placeholder='Caută furnizor după nume...'
          value={displayValue}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              setIsFocused(false)
              if (!value) setSearchTerm('')
            }, 300)
          }}
          className='pr-10'
        />

        {/* Buton de Ștergere (Clear) */}
        {value && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='absolute right-0 top-0 h-full px-3'
            onClick={handleClear}
          >
            <X className='h-4 w-4 text-muted-foreground' />
          </Button>
        )}
      </div>

      {/* Lista de rezultate (apare doar când suntem în modul căutare ȘI când s-a tastat ceva) */}
      {isFocused && searchTerm.length > 0 && (
        <div className='absolute z-20 w-full max-h-48 overflow-y-auto rounded-md border bg-background shadow-lg'>
          {filteredSuppliers.length === 0 ? (
            <p className='p-4 text-sm text-muted-foreground'>
              Niciun furnizor găsit.
            </p>
          ) : (
            filteredSuppliers.map((supplier) => (
              <div
                key={supplier._id}
                className='flex items-center justify-between p-3 cursor-pointer hover:bg-muted'
                onMouseDown={() => handleSelect(supplier._id)}
              >
                <div>
                  <p>{supplier.name}</p>
                  <p className='text-xs text-muted-foreground'>
                    CUI: {supplier.fiscalCode}
                  </p>
                </div>
                {value === supplier._id && (
                  <Check
                    className={cn(
                      'h-4 w-4 text-green-600',
                      value === supplier._id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
