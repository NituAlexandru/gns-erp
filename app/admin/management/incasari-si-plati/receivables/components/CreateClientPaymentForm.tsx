'use client'

import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import React from 'react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { ro } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_MAP,
} from '@/lib/db/modules/financial/treasury/payment.constants'
import { createClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { CreateClientPaymentSchema } from '@/lib/db/modules/financial/treasury/receivables/client-payment.validator'
import { SimpleClientSearch } from './SimpleClientSearch'

interface CreateClientPaymentFormProps {
  onFormSubmit: () => void
  initialClientId?: string
}

type FormValues = z.infer<typeof CreateClientPaymentSchema>

export function CreateClientPaymentForm({
  onFormSubmit,
  initialClientId,
}: CreateClientPaymentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateClientPaymentSchema),
    defaultValues: {
      clientId: initialClientId || undefined,
      paymentDate: new Date(),
      totalAmount: 0,
      paymentMethod: 'ORDIN_DE_PLATA',
      seriesName: '',
      paymentNumber: '',
      referenceDocument: '',
      notes: '',
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: FormValues) {
    try {
      const dataWithNumberAmount = {
        ...data,
        totalAmount: Number(data.totalAmount),
      }

      const result = await createClientPayment(dataWithNumberAmount)

      if (result.success) {
        if (result.allocationDetails && result.allocationDetails.length > 0) {
          toast.success(result.message, {
            duration: 10000,
            description: (
              <div className='mt-2'>
                <p className='font-medium'>Alocări automate efectuate:</p>
                <ul className='list-disc list-inside text-sm'>
                  {result.allocationDetails.map((alloc) => (
                    <li key={alloc.invoiceNumber}>
                      Factura {alloc.invoiceNumber}:{' '}
                      <span className='font-medium text-green-600'>
                        {formatCurrency(alloc.allocatedAmount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          })
        } else {
          toast.success(result.message, { duration: 5000 })
        }

        onFormSubmit()
        form.reset()
      } else {
        toast.error('Eroare la salvare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-2'>
        <FormField
          control={form.control}
          name='clientId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <FormControl>
                <SimpleClientSearch
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='seriesName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serie Document (Opțional)</FormLabel>
                <FormControl>
                  <Input placeholder='ex: EXTRAS' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='paymentNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Număr Document</FormLabel>
                <FormControl>
                  <Input placeholder='ex: 123456' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='totalAmount'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sumă Încasată</FormLabel>
              <FormControl>
                <Input
                  type='number'
                  step='0.01'
                  placeholder='0.00'
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4'>
          <FormField
            control={form.control}
            name='paymentDate'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel>Data Încasării</FormLabel>
                <FormControl>
                  <Calendar
                    mode='single'
                    selected={field.value}
                    onSelect={field.onChange}
                    locale={ro}
                    className='rounded-md border'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='notes'
            render={({ field }) => (
              <FormItem className='flex flex-col h-full'>
                <FormLabel>Notițe</FormLabel>
                <FormControl className='flex-grow'>
                  <Textarea
                    placeholder='Observații...'
                    {...field}
                    className='min-h-[200px] h-full'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='paymentMethod'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metodă de Plată</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Selectează o metodă...' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {PAYMENT_METHOD_MAP[method].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='referenceDocument'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referință (ex: OP 123)</FormLabel>
              <FormControl>
                <Input placeholder='Detalii document...' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type='submit' disabled={isSubmitting} className='w-full'>
          {isSubmitting ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          Salvează Încasarea
        </Button>
      </form>
    </Form>
  )
}
