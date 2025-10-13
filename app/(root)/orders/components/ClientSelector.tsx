'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
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
import {
  searchClients,
  getClientById,
  SearchedClient,
} from '@/lib/db/modules/client/client.actions'
import { IClientDoc } from '@/lib/db/modules/client/types'
import { useDebounce } from '@/hooks/use-debounce'
import { useEffect, useState } from 'react'

interface ClientSelectorProps {
  onClientSelect: (client: IClientDoc | null) => void
}

export function ClientSelector({ onClientSelect }: ClientSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedClient[]>([])
  const [selectedClient, setSelectedClient] = useState<IClientDoc | null>(null)
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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
      } catch (error) {
        console.error('[FRONTEND] Eroare la apelul searchClients:', error)
        setSearchResults([])
      } finally {
        setIsLoadingSearch(false)
      }
    }
    fetchClients()
  }, [debouncedSearchTerm])

  const handleSelect = async (clientFromSearch: SearchedClient) => {
    setOpen(false)
    setSearchTerm('')
    setIsFetchingDetails(true)

    try {
      const fullClientData = await getClientById(clientFromSearch._id)
      setSelectedClient(fullClientData)
      onClientSelect(fullClientData)
    } catch (error) {
      console.error('Clientul nu a putut fi încărcat:', error)
      // TODO: Gestionează eroarea (ex: afișează un toast/notificare)
      onClientSelect(null)
    } finally {
      setIsFetchingDetails(false)
    }
  }

  const displayName = selectedClient
    ? selectedClient.name
    : 'Caută client după nume sau CUI...'

  return (
    <div className='flex flex-col gap-4 w-full md:w-[400px]'>
      <label className='font-medium'>Selectează Clientul</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='w-full justify-between'
          >
            {displayName}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-[400px] p-0'>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder='Tastează pentru a căuta...'
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoadingSearch && (
                <div className='p-2 text-sm'>Se caută...</div>
              )}
              {!isLoadingSearch &&
                !searchResults.length &&
                debouncedSearchTerm.length > 1 && (
                  <CommandEmpty>Niciun client găsit.</CommandEmpty>
                )}
              <CommandGroup>
                {searchResults.map((client) => (
                  <CommandItem
                    key={client._id}
                    value={client.name}
                    onSelect={() => handleSelect(client)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${selectedClient?._id.toString() === client._id ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <div>
                      <p className='font-semibold'>{client.name}</p>
                      <p className='text-xs text-muted-foreground'>
                        {client.vatId}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isFetchingDetails && (
        <div className='p-2 text-sm'>Se încarcă detaliile clientului...</div>
      )}
      {selectedClient && !isFetchingDetails && (
        <div className='mt-2 p-3 border rounded-md bg-muted text-sm'>
          <p>
            <strong>Client:</strong> {selectedClient.name}
          </p>
          <p>
            <strong>CUI:</strong> {selectedClient.vatId}
          </p>
          <p>
            <strong>Adresă:</strong>{' '}
            {`${selectedClient.address.strada}, ${selectedClient.address.localitate}`}
          </p>
          <p>
            <strong>Telefon:</strong> {selectedClient.phone || 'N/A'}
          </p>
          <p>
            <strong>Email:</strong> {selectedClient.email || 'N/A'}
          </p>
          <p>
            <strong>Termen plată:</strong> {selectedClient.paymentTerm} zile
          </p>
        </div>
      )}
    </div>
  )
}
