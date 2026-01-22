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
import { CalendarIcon, ChevronDown, Trash2, Truck } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ReceptionCreateInput } from '@/lib/db/modules/reception/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { Checkbox } from '@/components/ui/checkbox'
import { getActiveAssignments } from '@/lib/db/modules/fleet/assignments/assignments.actions'
import { useEffect, useState } from 'react'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ReceptionDeliveriesProps = {
  vatRates: VatRateDTO[]
  isVatPayer: boolean
}

export function ReceptionDeliveries({ vatRates }: ReceptionDeliveriesProps) {
  const form = useFormContext<ReceptionCreateInput>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'deliveries',
  })
  const defaultRate = vatRates && vatRates.length > 0 ? vatRates[0].rate : 0

  const [assignments, setAssignments] = useState<IPopulatedAssignmentDoc[]>([])

  useEffect(() => {
    getActiveAssignments().then((data) => setAssignments(data))
  }, [])

  const handleFillFromAssignment = (
    index: number,
    item: IPopulatedAssignmentDoc,
  ) => {
    // 1. Setăm Nume Șofer
    form.setValue(`deliveries.${index}.driverName`, item.driverId.name)

    // 2. Construim Numar Auto (Vehicul [+ Remorca])
    const vehicleNo = item.vehicleId.carNumber
    const trailerNo = item.trailerId?.licensePlate
    const fullCarNumber = trailerNo ? `${vehicleNo} / ${trailerNo}` : vehicleNo

    form.setValue(`deliveries.${index}.carNumber`, fullCarNumber)
  }

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
                                !field.value && 'text-muted-foreground',
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
                      {/* --- MODIFICARE AICI: Label cu Dropdown --- */}
                      <div className='flex justify-between items-center'>
                        <FormLabel>Nume Șofer</FormLabel>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type='button'
                              variant='secondary'
                              size='sm'
                              className='h-6 px-2 text-xs text-muted-foreground hover:text-primary'
                            >
                              <Truck className='mr-1 h-3 w-3' />

                              <ChevronDown className='ml-1 h-3 w-3' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align='end'
                            className='w-[250px]'
                          >
                            <DropdownMenuLabel>
                              Ansambluri Active
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {assignments.length === 0 ? (
                              <div className='p-2 text-xs text-muted-foreground'>
                                Nu există ansambluri active.
                              </div>
                            ) : (
                              assignments.map((asg) => (
                                <DropdownMenuItem
                                  key={asg._id}
                                  onClick={() =>
                                    handleFillFromAssignment(index, asg)
                                  }
                                  className='flex flex-col items-start cursor-pointer'
                                >
                                  <span className='font-medium'>
                                    {asg.name}
                                  </span>
                                  <span className='text-[10px] text-muted-foreground'>
                                    {asg.driverId.name} •{' '}
                                    {asg.vehicleId.carNumber}
                                  </span>
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {/* --- FINAL MODIFICARE --- */}

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
              <div className='grid grid-cols-1 md:grid-cols-4 items-end gap-2 pt-4 border-t'>
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
                          <SelectTrigger className='w-full'>
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
                  control={form.control}
                  name={`deliveries.${index}.transportVatRate`}
                  render={({ field }) => {
                    // 1. Calculăm valoarea pe loc pentru afișare
                    const currentCost =
                      form.watch(`deliveries.${index}.transportCost`) || 0
                    const currentRate = Number(field.value) || 0
                    const currentVatValue = currentCost * (currentRate / 100)

                    return (
                      <FormItem>
                        {/* 2. Label modificat cu Flex pentru a afișa suma în dreapta */}
                        <FormLabel className='flex justify-between items-center w-full'>
                          <span>TVA Transport</span>
                          <span className='text-muted-foreground'>
                            {formatCurrency(currentVatValue)}
                          </span>
                        </FormLabel>

                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder='Cota' />
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
                    )
                  }}
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
              {/* --- CHECKBOX COST INTERN --- */}
              <div className='pt-2'>
                <FormField
                  control={form.control}
                  name={`deliveries.${index}.isInternal`}
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start space-x-1 space-y-0 rounded-md border p-2 shadow-sm bg-muted/20'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            // Opțional: Dacă bifează, poți seta automat tipul pe INTERN
                            if (checked) {
                              form.setValue(
                                `deliveries.${index}.transportType`,
                                'INTERN',
                              )
                            }
                          }}
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel>
                          Cost Logistic Propriu (Fără Factură)
                        </FormLabel>
                        <p className='text-sm text-muted-foreground'>
                          Bifează dacă acest cost este suportat intern. Suma se
                          va adăuga automat la totalul facturilor pentru
                          validare, dar costul se va distribui pe produse.
                        </p>
                      </div>
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
              transportVatRate: defaultRate,
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
