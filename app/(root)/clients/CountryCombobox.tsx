'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import * as countryList from 'country-list'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useState } from 'react'

const COUNTRIES = countryList.getData().map((country) => ({
  value: country.code, // "RO"
  label: country.name, // "Romania"
}))

interface CountryComboboxProps {
  value: string
  onChange: (value: string) => void
}

export function CountryCombobox({ value, onChange }: CountryComboboxProps) {
  const [open, setOpen] = useState(false)

  const currentLabel =
    COUNTRIES.find((country) => country.value === value)?.label ||
    'Selectează țara...'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
        >
          <span className='truncate'>{currentLabel}</span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[250px] p-0 ml-8 cursor-pointer'>
        <Command>
          <CommandInput placeholder='Caută țara...' />
          <CommandList>
            <CommandEmpty>Nicio țară găsită.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((country) => (
                <CommandItem
                  className='cursor-pointer '
                  key={country.value}
                  value={country.label}
                  onSelect={() => {
                    onChange(country.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-0 h-4 w-4',
                      value === country.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {country.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
