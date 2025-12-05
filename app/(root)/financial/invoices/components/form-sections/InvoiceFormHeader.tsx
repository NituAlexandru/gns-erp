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
import { cn } from '@/lib/utils'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  ADVANCE_SCOPE_MAP,
  ADVANCE_SCOPES,
} from '@/lib/db/modules/financial/invoices/invoice.constants'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { VAT_CATEGORY_OPTIONS } from '@/lib/db/modules/setting/efactura/outgoing/outgoing.constants'

interface InvoiceFormHeaderProps {
  companySettings: ISettingInput
  seriesList: SeriesDTO[]
  selectedClient: IClientDoc | null
  selectedAddress: IAddress | null
  onAddressSelect: (address: IAddress | null) => void
  onShowNoteLoader: () => void
  initialData: Partial<InvoiceInput> | null
}

export function InvoiceFormHeader({
  seriesList,
  selectedClient,
  selectedAddress,
  onAddressSelect,
  onShowNoteLoader,
  initialData,
}: InvoiceFormHeaderProps) {
  const form = useFormContext<InvoiceInput>()
  const watchedInvoiceType = form.watch('invoiceType')

  return (
    <Card className='pt-0'>
      <CardHeader>
        <CardTitle className='hidden'>Antet Factură</CardTitle>
      </CardHeader>
      <CardContent className='py-0'>
        <div className='grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6'>
          {/* --- COLOANA 1: Client & Adresă --- */}
          <div className='space-y-2'>
            <div className='flex gap-2'>
              <FormField
                control={form.control}
                name='invoiceType'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Document</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || 'STANDARD'}
                      // Blochează selectorul dacă edităm o factură existentă
                      disabled={!!initialData}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Alege tipul documentului...' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='STANDARD'>
                          Factură Standard
                        </SelectItem>
                        <SelectItem value='AVANS'>Factură Avans</SelectItem>
                        <SelectItem value='STORNO'>
                          Factură Storno
                        </SelectItem>{' '}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Selector Scop Avans  */}
              {watchedInvoiceType === 'AVANS' && (
                <FormField
                  control={form.control}
                  name='advanceScope'
                  defaultValue={'GLOBAL'}
                  render={({ field }) => (
                    <FormItem className='flex gap-1 space-y-0 rounded-md border p-3 bg-muted/50'>
                      <FormLabel>Tipul Avansului</FormLabel>
                      <FormControl>
                        <TooltipProvider>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className='space-y-0'
                          >
                            {ADVANCE_SCOPES.map((scope) => (
                              <FormItem
                                key={scope}
                                className='flex items-center space-x-0 space-y-0'
                              >
                                <FormControl>
                                  <RadioGroupItem value={scope} />
                                </FormControl>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <FormLabel className='font-normal cursor-pointer'>
                                      {ADVANCE_SCOPE_MAP[scope].name}
                                    </FormLabel>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {ADVANCE_SCOPE_MAP[scope].description}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </TooltipProvider>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

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
            <div className='grid grid-cols-1 gap-4'>
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
                        <SelectTrigger className='w-full'>
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
              {/* --- SELECTOR CATEGORIE TVA --- */}
              <FormField
                control={form.control}
                name='vatCategory'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regim TVA (e-Factura)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || 'S'}
                      value={field.value || 'S'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selectează regimul TVA' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {VAT_CATEGORY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* --- CÂMP MOTIV SCUTIRE (Vizibil doar dacă NU e Standard) --- */}
              {form.watch('vatCategory') !== 'S' && (
                <FormField
                  control={form.control}
                  name='vatExemptionReason'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motiv Scutire / Referință Legală</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder='Ex: Taxare inversă cf. Art 331...'
                          className='resize-none h-20'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {/* --- NOTE FACTURĂ --- */}
              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note / Mențiuni</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Ex: Se aplică taxare inversă conform art...'
                        className='resize-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchedInvoiceType === 'STANDARD' && (
                <div className='flex items-center pt-2'>
                  <Button
                    className=' w-full  text-left '
                    type='button'
                    variant='outline'
                    disabled={!selectedClient || !selectedAddress}
                    onClick={onShowNoteLoader}
                  >
                    <Download className='mr-2 h-4 w-4' />
                    Încarcă Avize Nefacturate
                  </Button>
                </div>
              )}
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
