'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ReceptionCreateInput } from '@/lib/db/modules/reception/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ReceptionInvoicesProps {
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
  isVatPayer: boolean
}

export function ReceptionInvoices({
  vatRates,
  defaultVatRate,
}: ReceptionInvoicesProps) {
  const form = useFormContext<ReceptionCreateInput>()

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'invoices',
  })

  return (
    <Card className='col-span-1 md:col-span-3'>
      <CardHeader>
        <CardTitle>Detalii Facturare</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {fields.map((field, index) => {
          // Urmărim valorile din formular pentru a afișa calculele în timp real
          const watchedAmount = form.watch(`invoices.${index}.amount`) || 0
          const watchedVatRate = form.watch(`invoices.${index}.vatRate`) || 0
          const calculatedVat = watchedAmount * (watchedVatRate / 100)
          const totalWithVat = watchedAmount + calculatedVat
          const currency = form.watch(`invoices.${index}.currency`) || 'RON'

          return (
            <div key={field.id} className='p-3 border rounded-lg space-y-3'>
              <div className='overflow-x-auto'>
                <div className='flex items-end gap-3 min-w-[1080px]'>
                  {/* Serie */}
                  <FormField
                    control={form.control}
                    name={`invoices.${index}.series`}
                    render={({ field }) => (
                      <FormItem className='w-32'>
                        <FormLabel>Serie Factură</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Număr */}
                  <FormField
                    control={form.control}
                    name={`invoices.${index}.number`}
                    render={({ field }) => (
                      <FormItem className='w-40'>
                        <FormLabel>
                          Număr <span className='text-red-500'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Data */}
                  <FormField
                    control={form.control}
                    name={`invoices.${index}.date`}
                    render={({ field }) => (
                      <FormItem className='w-48'>
                        <FormLabel>
                          Data <span className='text-red-500'>*</span>
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className='mr-2 h-4 w-4' />
                                {field.value ? (
                                  format(new Date(field.value), 'PPP', {
                                    locale: ro,
                                  })
                                ) : (
                                  <span>Alege data</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0'>
                            <Calendar
                              mode='single'
                              selected={field.value as Date}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Scadență */}
                  <FormField
                    control={form.control}
                    name={`invoices.${index}.dueDate`}
                    render={({ field }) => (
                      <FormItem className='w-48'>
                        <FormLabel>Data Scadenței</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className='mr-2 h-4 w-4' />
                                {field.value ? (
                                  format(new Date(field.value), 'PPP', {
                                    locale: ro,
                                  })
                                ) : (
                                  <span>Alege data</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className='w-auto p-0'>
                            <Calendar
                              mode='single'
                              selected={field.value as Date}
                              onSelect={field.onChange}
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    )}
                  />

                  {/* Sumă */}
                  <FormField
                    control={form.control}
                    name={`invoices.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className={cn('w-44')}>
                        {' '}
                        <FormLabel>
                          Sumă (fără TVA){' '}
                          <span className='text-red-500'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            step='0.01'
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ''
                                  ? null
                                  : parseFloat(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Valută (Select) */}
                  <FormField
                    control={form.control}
                    name={`invoices.${index}.currency`}
                    render={({ field }) => (
                      <FormItem className='w-28'>
                        <FormLabel>Valută</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value ?? 'RON'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder='Valută' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='RON'>RON</SelectItem>
                            <SelectItem value='EUR'>EUR</SelectItem>
                            <SelectItem value='USD'>USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  {/* Curs valutar (vizibil doar dacă valuta ≠ RON) */}
                  {currency !== 'RON' && (
                    <FormField
                      control={form.control}
                      name={`invoices.${index}.exchangeRateOnIssueDate`}
                      render={({ field }) => (
                        <FormItem className='w-40'>
                          <FormLabel>Curs (RON / 1 {currency})</FormLabel>
                          <FormControl>
                            <Input
                              type='number'
                              step='0.0001'
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ''
                                    ? undefined
                                    : parseFloat(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Cota TVA */}
                  <FormField
                    control={form.control}
                    name={`invoices.${index}.vatRate`}
                    render={({ field }) => (
                      <FormItem className='w-36'>
                        <FormLabel>Cotă TVA</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='TVA...' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vatRates.map((rate) => (
                              <SelectItem
                                key={rate._id}
                                value={rate.rate.toString()}
                              >
                                {rate.rate}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Rezumat TVA & Total */}
                  <div className='w-60 p-2 border rounded-md bg-muted/30 text-sm'>
                    <div>
                      Val. TVA:{' '}
                      <span className='font-bold'>
                        {formatCurrency(calculatedVat)}
                      </span>
                    </div>
                    <div className='font-semibold'>
                      Total:{' '}
                      <span className='font-bold text-base'>
                        {formatCurrency(totalWithVat)}
                      </span>
                    </div>
                  </div>

                  {/* Ștergere rând */}
                  <div className='flex items-end'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => remove(index)}
                      className='h-8 w-8 text-destructive'
                      aria-label='Șterge factură'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() =>
            append({
              series: '',
              number: '',
              date: new Date(),
              dueDate: undefined,
              currency: 'RON',
              amount: 0,
              vatRate: defaultVatRate?.rate ?? 0, // Folosim cota default din DB, cu fallback la 0
            })
          }
        >
          Adaugă Factură
        </Button>
      </CardContent>
    </Card>
  )
}
