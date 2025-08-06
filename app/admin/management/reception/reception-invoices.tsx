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
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { ReceptionCreateInput } from '@/lib/db/modules/reception/types'

export function ReceptionInvoices() {
  const form = useFormContext<ReceptionCreateInput>()

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'invoices',
  })

  return (
    <Card className='col-span-1 md:col-span-2'>
      <CardHeader>
        <CardTitle>Detalii Facturare</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className='flex items-end gap-2 p-2 border rounded-md'
          >
            <FormField
              control={form.control}
              name={`invoices.${index}.series`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serie Factură</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`invoices.${index}.number`}
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>
                    Număr Factură <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`invoices.${index}.date`}
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>
                    Data Factură <span className='text-red-500'>*</span>
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
                            format(new Date(field.value), 'PPP', { locale: ro })
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
              control={form.control}
              name={`invoices.${index}.amount`}
              render={({ field }) => (
                <FormItem className='flex-1'>
                  <FormLabel>
                    Suma Factură <span className='text-red-500'>*</span>
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
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => remove(index)}
              className='flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        ))}
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() =>
            append({
              series: '',
              number: '',
              date: new Date(),
              amount: 0,
            })
          }
        >
          Adaugă Factură
        </Button>
      </CardContent>
    </Card>
  )
}
