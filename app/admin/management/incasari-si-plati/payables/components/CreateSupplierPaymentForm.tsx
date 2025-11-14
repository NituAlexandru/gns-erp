'use client'

import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, FieldErrors, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_MAP,
} from '@/lib/db/modules/financial/treasury/payment.constants'
import { createSupplierPayment } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { CreateSupplierPaymentFormSchema } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.validator'
import { ro } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { SimpleSupplierSearch } from './SimpleSupplierSearch'
import { formatCurrency } from '@/lib/utils'
import React, { useEffect, useMemo } from 'react'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'

interface CreateSupplierPaymentFormProps {
  suppliers: ISupplierDoc[]
  onFormSubmit: () => void
  budgetCategories: IBudgetCategoryTree[]
  initialSupplierId?: string
}

type FormValues = z.infer<typeof CreateSupplierPaymentFormSchema>

export function CreateSupplierPaymentForm({
  suppliers,
  onFormSubmit,
  budgetCategories,
  initialSupplierId,
}: CreateSupplierPaymentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateSupplierPaymentFormSchema),
    defaultValues: {
      supplierId: initialSupplierId || '',
      paymentDate: new Date(),
      totalAmount: 0,
      paymentMethod: 'ORDIN_DE_PLATA',
      seriesName: '',
      referenceDocument: '',
      mainCategoryId: undefined,
      subCategoryId: undefined,
    },
  })

  const { isSubmitting } = form.formState
  const { control, setValue } = form

  const watchedMainCategory = useWatch({
    control,
    name: 'mainCategoryId',
  })

  const subCategories = useMemo(() => {
    if (!watchedMainCategory) return []
    const selectedCategory = budgetCategories.find(
      (cat) => cat._id === watchedMainCategory
    )
    return selectedCategory?.children || []
  }, [watchedMainCategory, budgetCategories])

  useEffect(() => {
    setValue('subCategoryId', undefined)
  }, [watchedMainCategory, setValue])

  // --- (Logica onSubmit și onInvalid rămâne exact la fel) ---
  async function onSubmit(data: FormValues) {
    try {
      const result = await createSupplierPayment(data)
      if (result.success) {
        if (result.allocationDetails && result.allocationDetails.length > 0) {
          toast.success('Plată salvată și alocată automat!', {
            description: (
              <div className='mt-2'>
                <p className='font-medium'>Alocări efectuate:</p>
                <ul className='list-disc list-inside text-sm'>
                  {result.allocationDetails.map((alloc) => (
                    <li key={alloc.invoiceNumber}>
                      Factura {alloc.invoiceNumber}:{' '}
                      {formatCurrency(alloc.allocatedAmount)}
                    </li>
                  ))}
                </ul>
              </div>
            ),
            duration: 10000,
          })
        } else {
          toast.success(result.message || 'Plata a fost salvată.')
        }
        onFormSubmit()
        form.reset()
      } else {
        toast.error('Eroare la salvare:', { description: result.message })
      }
    } catch (e: unknown) {
      console.error(e)
      toast.error('A apărut o eroare neașteptată.', {
        description: e instanceof Error ? e.message : 'Eroare necunoscută',
      })
    }
  }

  const onInvalid = (errors: FieldErrors<FormValues>) => {
    console.error('--- VALIDARE EȘUATĂ (PLATA BLOCATĂ) ---', errors)
    toast.error('Formularul de plată conține erori.')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className='space-y-6'
      >
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <FormField
            control={control}
            name='supplierId'
            render={({ field }) => (
              <FormItem className='md:col-span-2'>
                <FormLabel>Furnizor</FormLabel>
                <SimpleSupplierSearch
                  suppliers={suppliers}
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='seriesName'
            render={({ field }) => (
              <FormItem className='md:col-span-1'>
                <FormLabel>Serie Document (Opțional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='ex: OP'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='referenceDocument'
            render={({ field }) => (
              <FormItem className='md:col-span-1'>
                <FormLabel>Număr Document (Opțional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='ex: 12345'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* --- MODIFICARE: GRUPA 2 (Suma și Metoda) --- */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField
            control={control}
            name='totalAmount'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sumă Plătită</FormLabel>
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
          <FormField
            control={control}
            name='paymentMethod'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metodă de Plată</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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
        </div>

        {/* --- MODIFICARE: GRUPA 3 (Calendar și Notițe) --- */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6'>
          <FormField
            control={control}
            name='paymentDate'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel>Data Plății</FormLabel>
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
          {/* Adăugăm wrapper-ul flex pentru ca Textarea să ia înălțimea calendarului */}
          <div className='flex flex-col h-full'>
            <FormField
              control={control}
              name='notes'
              render={({ field }) => (
                <FormItem className='flex flex-col flex-grow'>
                  <FormLabel>Notițe</FormLabel>
                  <FormControl className='flex-grow'>
                    <Textarea
                      placeholder='Observații...'
                      {...field}
                      value={field.value || ''}
                      className='h-full min-h-[100px]'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* --- MODIFICARE: GRUPA 4 (Buget) --- */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField
            control={control}
            name='mainCategoryId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categorie Buget (Opțional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează categoria principală...' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {budgetCategories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Afișăm subcategoria doar dacă există */}
          {subCategories.length > 0 && (
            <FormField
              control={control}
              name='subCategoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategorie Buget (Opțional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Selectează subcategoria...' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subCategories.map((subCat: IBudgetCategoryTree) => (
                        <SelectItem key={subCat._id} value={subCat._id}>
                          {subCat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Butonul de Salvare */}
        <Button type='submit' disabled={isSubmitting} className='w-full'>
          {isSubmitting ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          Salvează Plata
        </Button>
      </form>
    </Form>
  )
}
