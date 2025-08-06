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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ReceptionCreateInput } from '@/lib/db/modules/reception/types'

export function ReceptionDeliveries() {
  // Folosim useFormContext pentru a accesa formularul din componenta părinte
  const form = useFormContext<ReceptionCreateInput>()

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'deliveries',
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Livrări Fizice & Costuri Transport</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {fields.map((field, index) => {
          const transportType = form.watch(`deliveries.${index}.transportType`)
          return (
            <div key={field.id} className='p-3 border rounded-lg space-y-4'>
              {/* --- Butonul de ștergere --- */}
              <div className='flex justify-end -mt-2 mb-0'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='text-destructive'
                  onClick={() => remove(index)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>

              {/* --- RÂNDUL 1: Aviz, Șofer, Mașină --- */}
              <div className='grid grid-cols-1 md:grid-cols-5 items-end gap-2'>
                <FormField
                  name={`deliveries.${index}.dispatchNoteSeries`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serie Aviz</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  name={`deliveries.${index}.dispatchNoteNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Număr Aviz <span className='text-red-500'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`deliveries.${index}.dispatchNoteDate`}
                  render={({ field }) => (
                    <FormItem className='flex flex-col'>
                      <FormLabel>
                        Data Aviz <span className='text-red-500'>*</span>
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
                <FormField
                  name={`deliveries.${index}.driverName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nume Șofer</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Popescu Ion'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  name={`deliveries.${index}.carNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Număr Auto</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='B123XYZ'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* --- RÂNDUL 2: Transport & Mențiuni --- */}
              <div className='grid grid-cols-1 md:grid-cols-3 items-end gap-2 pt-4 border-t'>
                <FormField
                  control={form.control}
                  name={`deliveries.${index}.transportType`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Tip Transport <span className='text-red-500'>*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Alege tipul...' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='INTERN'>
                            Transport Intern
                          </SelectItem>
                          <SelectItem value='EXTERN_FURNIZOR'>
                            Transport Furnizor
                          </SelectItem>
                          <SelectItem value='TERT'>Transport Terț</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`deliveries.${index}.transportCost`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cost Transport (RON){' '}
                        <span className='text-red-500'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`deliveries.${index}.notes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mențiuni Livrare</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='ex: palet deteriorat'
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* --- Rândul 3: Detalii Transportator Terț (apare condiționat) --- */}
              {transportType === 'TERT' && (
                <div className='p-3 pt-4 border-t space-y-3 bg-muted/30 rounded-md'>
                  <h5 className='font-semibold text-sm'>
                    Detalii Transportator Terț
                  </h5>
                  <FormField
                    name={`deliveries.${index}.tertiaryTransporterDetails.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nume Firma <span className='text-red-500'>*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className='grid grid-cols-2 gap-4'>
                    <FormField
                      name={`deliveries.${index}.tertiaryTransporterDetails.cui`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CUI</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name={`deliveries.${index}.tertiaryTransporterDetails.regCom`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nr. Reg. Com.</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <Button
          type='button'
          variant='outline'
          onClick={() =>
            append({
              dispatchNoteSeries: '',
              dispatchNoteNumber: '',
              dispatchNoteDate: new Date(),
              driverName: '',
              carNumber: '',
              notes: '',
              transportType: 'EXTERN_FURNIZOR',
              transportCost: 0,
              tertiaryTransporterDetails: { name: '', cui: '', regCom: '' },
            })
          }
        >
          Adaugă Livrare
        </Button>
      </CardContent>
    </Card>
  )
}
