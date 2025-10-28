'use client'

import { useFormContext, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { PopulatedOrder } from '@/lib/db/modules/order/types'
import { DELIVERY_SLOTS } from '@/lib/db/modules/deliveries/constants'
import { Checkbox } from '@/components/ui/checkbox'

interface DeliveryHeaderProps {
  clientSnapshot: PopulatedOrder['clientSnapshot']
  deliveryAddress: PopulatedOrder['deliveryAddress']
  vehicleType: string
  orderNotes?: string
}

export function DeliveryHeader({
  clientSnapshot,
  deliveryAddress,
  vehicleType,
  orderNotes,
}: DeliveryHeaderProps) {
  const { control } = useFormContext()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalii Pre-planificare</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* Rând 1: Detalii Client și Adresă (Non-interactive) */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-1'>
            <FormLabel>Client</FormLabel>
            <p className='text-sm font-medium p-2 border rounded-md bg-muted'>
              {clientSnapshot.name}
            </p>
          </div>
          <div className='space-y-1'>
            <FormLabel>Adresă Livrare</FormLabel>
            <p className='text-sm font-medium p-2 border rounded-md bg-muted'>
              {`${deliveryAddress.strada}, Nr. ${deliveryAddress.numar}, ${deliveryAddress.localitate}, ${deliveryAddress.judet}`}
            </p>
          </div>
        </div>
        {orderNotes && (
          <div className='space-y-1'>
            <FormLabel>Note Comandă: </FormLabel>
            <p className='text-sm font-medium p-1 pl-2 border rounded-md bg-muted min-h-[40px] w-full'>
              {orderNotes}
            </p>
          </div>
        )}

        {/* Rând 2: Inputuri Formular (Interactive) */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-start'>
          <div className='space-y-4'>
            <FormField
              control={control}
              name='requestedDeliveryDate'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Data Solicitată</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'pl-3 text-left font-normal w-full', // w-full
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
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
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Tip Vehicul (din comandă)</FormLabel>
              <Input disabled value={vehicleType} className='bg-muted' />{' '}
                      <Controller
                control={control}
                name='vehicleType'
                defaultValue={vehicleType}
                render={({ field }) => <input type='hidden' {...field} />}
              />
            </FormItem>
          </div>
          {/* Coloana 2 & 3 (Ocupă 2/3) */}
          <div className='md:col-span-2'>
           
            <Controller
              control={control}
              name='requestedDeliverySlots'
              render={(
                { field } 
              ) => (
                <FormItem>
                  <div className='mb-2'>
                    <FormLabel>Interval(e) Orar(e) Solicitat(e)</FormLabel>
                  </div>
                  {/* Container Grid pt Checkboxes */}
                  <div className='grid grid-cols-3 gap-x-4 gap-y-2'>
                    {DELIVERY_SLOTS.map((slot) => (
                      <FormItem
                        key={slot}
                        className='flex flex-row items-center space-x-2 space-y-0'
                      >
                        <FormControl>
                          <Checkbox
                           checked={(field.value || []).includes(slot)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [] // Array-ul curent
                              let newValue: string[]
                              if (checked) {
                              
                                newValue = [...currentValue, slot]
                              } else {
                              
                                newValue = currentValue.filter(
                                  (value: string) => value !== slot
                                )
                              }
                              field.onChange(newValue) 
                            }}
                          />
                        </FormControl>
                        <FormLabel className='font-normal text-sm whitespace-nowrap'>
                          {slot}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        {/* Rând 3: Câmpuri Noi (Note Livrare, UIT) --- */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField
            control={control}
            name='deliveryNotes'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Livrare (Opțional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Instrucțiuni speciale pentru șofer, detalii, restricții rutiere...'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='uitCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cod UIT (Opțional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Introduceți codul UIT aici...'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
