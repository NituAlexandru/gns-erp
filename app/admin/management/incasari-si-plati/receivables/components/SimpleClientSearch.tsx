'use client'

import { Check, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  SearchedClient,
  searchClients,
} from '@/lib/db/modules/client/client.actions'
import { useDebounce } from '@/hooks/use-debounce'
import { useEffect, useState } from 'react'

interface SimpleClientSearchProps {
  value: string
  onChange: (value: string) => void
  initialClientName?: string
}

export function SimpleClientSearch({
  value,
  onChange,
  initialClientName = '',
}: SimpleClientSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedName, setSelectedName] = useState(initialClientName)
  const [results, setResults] = useState<SearchedClient[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  useEffect(() => {
    // Verificăm și 'isFocused' pentru a nu rula căutarea la blur
    if (debouncedSearchTerm.length < 2 || !isFocused) {
      setResults([])
      setIsLoading(false)
      return
    }

    const fetchClients = async () => {
      setIsLoading(true)
      const clientResults = await searchClients(debouncedSearchTerm)
      setResults(clientResults)
      setIsLoading(false)
    }

    fetchClients()
  }, [debouncedSearchTerm, isFocused])

  // Setează numele inițial dacă se schimbă 'value' (ex: la resetarea formularului)
  useEffect(() => {
    if (!value) {
      setSelectedName('')
    } else {
      if (initialClientName) {
        setSelectedName(initialClientName)
      }
    }
  }, [value, initialClientName])

  const handleSelect = (client: SearchedClient) => {
    onChange(client._id)
    setSelectedName(client.name)
    setSearchTerm('')
    setIsFocused(false)
    setResults([])
  }

  const handleClear = () => {
    onChange('')
    setSelectedName('')
    setSearchTerm('')
    setIsFocused(true)
  }

  const displayValue = isFocused ? searchTerm : selectedName

  return (
    <div className='relative w-full space-y-1'>
      <div className='relative flex'>
        <Input
          placeholder='Caută client după nume, CUI sau CNP...'
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value)

            if (value) {
              onChange('')
              setSelectedName('')
            }
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              setIsFocused(false)
              if (!value) {
                setSearchTerm('')
                setSelectedName('')
              }
            }, 150)
          }}
          className='pr-10'
        />

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

      {/* Lista de rezultate (Dropdown-ul) */}
      {isFocused && (searchTerm.length > 1 || isLoading) && (
        <div className='absolute z-20 w-full max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg'>
          {isLoading && (
            <div className='flex items-center justify-center p-4'>
              <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          )}
          {!isLoading && results.length === 0 && searchTerm.length > 1 && (
            <p className='p-4 text-sm text-muted-foreground'>
              Niciun client găsit.
            </p>
          )}
          {!isLoading &&
            results.length > 0 &&
            results.map((client) => (
              <div
                key={client._id}
                className='flex items-center justify-between p-3 cursor-pointer hover:bg-muted'
                onMouseDown={() => handleSelect(client)}
              >
                <div>
                  <p>{client.name}</p>
                  <p className='text-xs text-muted-foreground'>
                    {client.vatId}
                  </p>
                </div>
                {value === client._id && (
                  <Check className='h-4 w-4 text-green-600' />
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
