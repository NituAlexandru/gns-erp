'use client'

import { useFormContext } from 'react-hook-form'
import { InvoiceInput } from '@/lib/db/modules/financial/invoices/invoice.types'
import { IAddress, IClientDoc } from '@/lib/db/modules/client/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils' // Am scos 'formatCurrency'
import { CalendarIcon, Download } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClientSelector } from '@/app/(root)/orders/components/ClientSelector'
import { SeriesDTO } from '@/lib/db/modules/numbering/types'
import { InvoiceAddressSelector } from './InvoiceAddressSelector'
import { ISettingInput } from '@/lib/db/modules/setting/types'
import { InvoiceFormTotals } from './InvoiceFormTotals'

interface InvoiceFormHeaderProps {
  companySettings: ISettingInput
  seriesList: SeriesDTO[]
  selectedClient: IClientDoc | null
  selectedAddress: IAddress | null
  onAddressSelect: (address: IAddress | null) => void
  onShowNoteLoader: () => void
}

export function InvoiceFormHeader({
  seriesList,
  selectedClient,
  selectedAddress,
  onAddressSelect,
  onShowNoteLoader,
}: InvoiceFormHeaderProps) {
  const form = useFormContext<InvoiceInput>()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antet Factură</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* --- COLOANA 1: Client & Adresă --- */}
          <div className='space-y-6'>
            <FormField
              control={form.control}
              name='clientId'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <ClientSelector
                    selectedClient={selectedClient}
                    onClientSelect={(client) => {
                      field.onChange(client?._id.toString() || undefined)
                      onAddressSelect(null)
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            {selectedClient && (
              <InvoiceAddressSelector
                client={selectedClient}
                onAddressSelect={onAddressSelect}
              />
            )}
          </div>

          {/* --- COLOANA 2: Date, Serie, Buton --- */}
          <div className='space-y-6'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='invoiceDate'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Data Emiterii</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ro })
                            ) : (
                              <span>Alege o dată</span>
                            )}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='dueDate'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Data Scadenței</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ro })
                            ) : (
                              <span>Alege o dată</span>
                            )}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='seriesName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serie Factură</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Alege o serie...' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {seriesList.map((series) => (
                        <SelectItem
                          key={series._id.toString()}
                          value={series.name}
                        >
                          {series.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex justify-center items-center pt-6'>
              <Button
                type='button'
                variant='outline'
                disabled={!selectedClient || !selectedAddress}
                onClick={onShowNoteLoader}
              >
                <Download className='mr-2 h-4 w-4' />
                Încarcă Avize Nefacturate
              </Button>
            </div>
          </div>

          {/* --- COLOANA 3: Totaluri (Componenta Nouă) --- */}
          <div className='space-y-6'>
            <InvoiceFormTotals />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
