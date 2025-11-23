'use client'

import {
  AlertCircle,
  Ban,
  Check,
  CheckCircle,
  ChevronsUpDown,
} from 'lucide-react'
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
import { cn, formatCurrency } from '@/lib/utils'
import { ClientWithSummary } from '@/lib/db/modules/client/summary/client-summary.model'

interface ClientSelectorProps {
  onClientSelect: (client: IClientDoc | null) => void
  selectedClient: ClientWithSummary | null
}

export function ClientSelector({
  onClientSelect,
  selectedClient,
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchedClient[]>([])
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
      // Acum nu mai setăm starea locală, ci doar notificăm părintele
      onClientSelect(fullClientData)
    } catch (error) {
      console.error('Clientul nu a putut fi încărcat:', error)
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
        <div className='mt-2 p-3 border rounded-md bg-card text-sm space-y-3 shadow-sm'>
          {/* Secțiunea Financiară */}
          <div className='pb-3 border-b space-y-2'>
            {/* Plafon */}
            <div className='flex justify-between items-center'>
              <span className='text-muted-foreground'>Plafon Credit:</span>
              <span className='font-semibold'>
                {selectedClient.summary?.creditLimit
                  ? formatCurrency(selectedClient.summary.creditLimit)
                  : 'Nelimitat / Nesetat'}
              </span>
            </div>

            {/* Sold */}
            <div className='flex justify-between items-center'>
              <span className='text-muted-foreground'>Sold Curent:</span>
              <span
                className={cn(
                  'font-bold',
                  (selectedClient.summary?.outstandingBalance || 0) > 0.01
                    ? 'text-red-500'
                    : 'text-green-500'
                )}
              >
                {formatCurrency(
                  selectedClient.summary?.outstandingBalance || 0
                )}
              </span>
            </div>

            {/* Facturi Scadente (Apare doar dacă există) */}
            {(selectedClient.summary?.overdueInvoicesCount || 0) > 0 && (
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>
                  Scadențe depășite:
                </span>
                <span className='font-bold text-destructive flex items-center gap-1'>
                  <AlertCircle className='h-3 w-3' />
                  {selectedClient.summary?.overdueInvoicesCount} facturi (
                  {formatCurrency(selectedClient.summary?.overdueBalance || 0)})
                </span>
              </div>
            )}

            {/* Status Livrare */}
            <div className='flex justify-between items-center p-0'>
              <span className='text-muted-foreground'>Status Livrare:</span>
              {selectedClient.summary?.isBlocked ? (
                <span className='font-bold text-destructive flex items-center gap-1  rounded'>
                  <Ban className='h-3 w-3' /> Livrări Sistate
                </span>
              ) : (
                <span className='font-bold text-green-500 flex items-center gap-1  rounded'>
                  <CheckCircle className='h-3 w-3 text-green-500' /> Livrări
                  Permise
                </span>
              )}
            </div>
          </div>

          {/* Detalii Generale  */}
          <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground'>
            {/* Rândul 1: CUI și Termen Plată */}
            <p>
              <strong className='text-foreground'>CUI:</strong>{' '}
              {selectedClient.vatId || selectedClient.cnp}
            </p>
            <p>
              <strong className='text-foreground'>Termen plată:</strong>{' '}
              {selectedClient.paymentTerm} zile
            </p>

            {/* Rândul 2: Contact */}
            <p>
              <strong className='text-foreground'>Telefon:</strong>{' '}
              {selectedClient.phone || 'N/A'}
            </p>
            <p>
              <strong className='text-foreground'>Email:</strong>{' '}
              <span className='break-all'>{selectedClient.email || 'N/A'}</span>
            </p>

            {/* Rândul 3: Adresa (pe toată lățimea) */}
            <p className='col-span-2'>
              <strong className='text-foreground'>Adresă:</strong>{' '}
              {`${selectedClient.address.strada}, ${selectedClient.address.localitate}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
