'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Search, X, Loader2 } from 'lucide-react'
import {
  searchClients,
  getClientById,
  SearchedClient,
} from '@/lib/db/modules/client/client.actions'
import { IClientDoc } from '@/lib/db/modules/client/types'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ClientWithSummary } from '@/lib/db/modules/client/summary/client-summary.model'

interface InlineClientSelectorProps {
  onClientSelect: (client: IClientDoc | null) => void
  selectedClient: ClientWithSummary | null
}

export function InlineClientSelector({
  onClientSelect,
  selectedClient,
}: InlineClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedClient[]>([])
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)

  // Ref pentru a detecta click-ul în afară și a închide lista
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // 1. Căutare automată
  useEffect(() => {
    async function fetchClients() {
      if (debouncedSearchTerm.length < 2) {
        setSearchResults([])
        return
      }
      setIsLoadingSearch(true)
      try {
        const clients = await searchClients(debouncedSearchTerm)
        setSearchResults(clients)
        setIsOpen(true) // Deschidem automat lista când avem rezultate
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsLoadingSearch(false)
      }
    }
    fetchClients()
  }, [debouncedSearchTerm])

  // 2. Gestionare Click Outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 3. Selecția
  const handleSelect = async (clientFromSearch: SearchedClient) => {
    setIsOpen(false)
    setSearchTerm('') // Resetăm căutarea
    setIsFetchingDetails(true)

    try {
      const fullClientData = await getClientById(clientFromSearch._id)
      onClientSelect(fullClientData)
    } catch (error) {
      console.error('Client load error:', error)
      onClientSelect(null)
    } finally {
      setIsFetchingDetails(false)
    }
  }

  const handleClear = () => {
    onClientSelect(null)
    setSearchTerm('')
  }

  // --- RENDERING ---

  // A. Dacă avem client selectat -> Afișăm modul "Vizualizare"
  if (selectedClient) {
    return (
      <div className='flex items-center justify-between p-2 border rounded-md border-green-500'>
        <div className='flex items-center gap-2 overflow-hidden'>
          <div className='bg-green-100 p-1.5 rounded-full shrink-0'>
            <Check className='h-3 w-3 text-green-500' />
          </div>
          <div className='flex flex-col min-w-0'>
            <span className='font-semibold text-sm truncate'>
              {selectedClient.name}
            </span>
            <span className='text-xs text-muted-foreground truncate'>
              {selectedClient.vatId || selectedClient.cnp}
            </span>
          </div>
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 w-7 p-0 text-muted-foreground hover:text-red-500'
          onClick={handleClear}
          title='Schimbă clientul'
        >
          <X className='h-4 w-4' />
        </Button>
      </div>
    )
  }

  // B. Dacă NU avem client -> Afișăm modul "Căutare"
  return (
    <div className='relative w-full' ref={containerRef}>
      <div className='relative'>
        <Search className='absolute left-2.5 top-3.5 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder={
            isFetchingDetails ? 'Se încarcă...' : 'Caută client (nume/CUI)...'
          }
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className='pl-9 h-11'
          disabled={isFetchingDetails}
        />
        {isFetchingDetails && (
          <div className='absolute right-2.5 top-2.5'>
            <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
          </div>
        )}
      </div>

      {/* LISTA DE REZULTATE (Randată INLINE, absolut față de input) */}
      {isOpen && searchTerm.length >= 2 && (
        <div className='absolute top-full mt-1 w-full bg-white dark:bg-secondary border rounded-md shadow-lg z-[100] max-h-[250px] overflow-y-auto'>
          {isLoadingSearch ? (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin inline mr-2' />
              Se caută...
            </div>
          ) : searchResults.length === 0 ? (
            <div className='p-4 text-center text-sm text-muted-foreground'>
              Niciun client găsit.
            </div>
          ) : (
            <ul className='py-1'>
              {searchResults.map((client) => (
                <li
                  key={client._id}
                  className='px-3 py-2 text-sm hover:bg-accent cursor-pointer flex flex-col border-b last:border-0 border-dashed border-gray-100'
                  onClick={() => handleSelect(client)}
                >
                  <span className='font-medium text-foreground'>
                    {client.name}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {client.vatId || 'Fără CUI'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
