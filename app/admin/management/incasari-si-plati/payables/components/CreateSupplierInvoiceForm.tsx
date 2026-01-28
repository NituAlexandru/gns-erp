'use client'

import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch, FieldErrors } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { formatCurrency, round2 } from '@/lib/utils'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
// --- IMPORT NOU ---
import {
  createSupplierInvoice,
  updateSupplierInvoice,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import {
  CreateSupplierInvoiceSchema,
  SupplierSnapshotSchema,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.validator'
import { SupplierInvoiceLineEditor } from './SupplierInvoiceLineEditor'
import { useEffect, useState } from 'react'
import { SimpleSupplierSearch } from './SimpleSupplierSearch'
import { ro } from 'date-fns/locale'
import { UNITS } from '@/lib/constants'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SUPPLIER_INVOICE_TYPE_LABELS,
  SUPPLIER_INVOICE_TYPES,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'

const FormInputSchema = CreateSupplierInvoiceSchema.pick({
  supplierId: true,
  invoiceType: true,
  invoiceSeries: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  items: true,
  notes: true,
})

export type InvoiceFormValues = z.infer<typeof FormInputSchema>

interface CreateSupplierInvoiceFormProps {
  suppliers: ISupplierDoc[]
  onFormSubmit: () => void
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
  initialData?: InvoiceFormValues & { _id: string }
}

export function CreateSupplierInvoiceForm({
  suppliers,
  onFormSubmit,
  vatRates,
  defaultVatRate,
  initialData,
}: CreateSupplierInvoiceFormProps) {
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(FormInputSchema),
    defaultValues: initialData
      ? {
          supplierId:
            typeof initialData.supplierId === 'object' &&
            initialData.supplierId !== null
              ? (initialData.supplierId as any)._id
              : initialData.supplierId,
          invoiceType: initialData.invoiceType,
          invoiceSeries: initialData.invoiceSeries,
          invoiceNumber: initialData.invoiceNumber,
          invoiceDate: new Date(initialData.invoiceDate),
          dueDate: new Date(initialData.dueDate),
          items: initialData.items,
          notes: initialData.notes || '',
        }
      : {
          supplierId: '',
          invoiceType: 'STANDARD',
          invoiceSeries: '',
          invoiceNumber: '',
          invoiceDate: new Date(),
          dueDate: new Date(),
          items: [],
          notes: '',
        },
  })

  const { isSubmitting } = form.formState
  const { control } = form
  const watchedItems = useWatch({ control, name: 'items' })

  // Definim stările pentru totalurile vizuale
  // Inițializăm stările corect dacă suntem pe EDIT
  const [subtotal, setSubtotal] = useState(0)
  const [vatTotal, setVatTotal] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)

  // --- USE EFFECT PENTRU CALCUL TOTALURI ---
  useEffect(() => {
    if (!watchedItems) return
    let totalSubtotal = 0
    let totalVat = 0
    watchedItems.forEach((item) => {
      const quantity = item.quantity || 0
      const unitPrice = item.unitPrice || 0
      const vatRate = item.vatRateDetails.rate || 0
      const lineValue = round2(quantity * unitPrice)
      const vatValue = round2(lineValue * (vatRate / 100))
      totalSubtotal += lineValue
      totalVat += vatValue
    })
    const grandTotal = round2(totalSubtotal + totalVat)

    setSubtotal(totalSubtotal)
    setVatTotal(totalVat)
    setGrandTotal(grandTotal)
  }, [watchedItems])

  // Verificarea TVA (după Hook-uri)
  if (!defaultVatRate) {
    return (
      <div className='flex items-center justify-center h-full p-8 text-center'>
        <p className='text-lg font-semibold text-red-500'>
          Eroare Critică: Cota TVA implicită nu este setată în sistem.
        </p>
      </div>
    )
  }

  // Funcția onSubmit
  async function onSubmit(data: InvoiceFormValues) {
    try {
      const selectedSupplier = suppliers.find((s) => s._id === data.supplierId)

      if (!selectedSupplier) {
        toast.error('Furnizorul selectat nu a fost găsit.')
        return
      }

      const supplierAddress = selectedSupplier.address || {}

      // 1. Creăm Snapshot-ul
      const supplierSnapshot: z.infer<typeof SupplierSnapshotSchema> = {
        name: selectedSupplier.name,
        cui: selectedSupplier.fiscalCode || '',
        regCom: selectedSupplier.regComNumber || '',
        address: {
          judet: supplierAddress.judet || '',
          localitate: supplierAddress.localitate || '',
          strada: supplierAddress.strada || '',
          numar: supplierAddress.numar || '',
          codPostal: supplierAddress.codPostal || '',
          alteDetalii: supplierAddress.alteDetalii || '',
          tara: supplierAddress.tara || 'RO',
        },
        bank: selectedSupplier.bankAccountLei?.bankName || '',
        iban: selectedSupplier.bankAccountLei?.iban || '',
      }

      // 2. Creăm Liniile finale
      const finalItems = data.items.map((item) => {
        const lineValue = round2((item.quantity || 0) * (item.unitPrice || 0))
        const vatValue = round2(
          lineValue * ((item.vatRateDetails.rate || 0) / 100),
        )
        return {
          ...item,
          lineValue: lineValue,
          vatRateDetails: { ...item.vatRateDetails, value: vatValue },
          lineTotal: round2(lineValue + vatValue),
        }
      })

      // 3. Creăm Totalurile finale (din stările locale)
      const finalTotals = {
        subtotal: subtotal,
        vatTotal: vatTotal,
        grandTotal: grandTotal,
        productsSubtotal: subtotal,
        productsVat: vatTotal,
        packagingSubtotal: 0,
        packagingVat: 0,
        servicesSubtotal: 0,
        servicesVat: 0,
        manualSubtotal: 0,
        manualVat: 0,
      }

      // 4. Creăm payload-ul FINAL
      const payload = {
        ...data,
        items: finalItems,
        totals: finalTotals,
        supplierSnapshot: supplierSnapshot,
      }

      // Validare finală
      const validation = CreateSupplierInvoiceSchema.safeParse(payload)
      if (!validation.success) {
        console.error('Eroare validare payload final:', validation.error.errors)
        toast.error('Eroare la validarea datelor finale înainte de trimitere.')
        return
      }

      let result
      if (initialData) {
        // Suntem pe EDIT
        result = await updateSupplierInvoice(initialData._id, validation.data)
      } else {
        // Suntem pe CREATE
        result = await createSupplierInvoice(validation.data)
      }

      if (result.success) {
        toast.success(result.message)
        onFormSubmit()
      } else {
        toast.error('Eroare la salvare:', { description: result.message })
      }
    } catch (e: unknown) {
      console.error(e)
      toast.error('A apărut o eroare neașteptată la trimitere.', {
        description: e instanceof Error ? e.message : 'Eroare necunoscută',
      })
    }
  }

  // Funcția onInvalid
  const onInvalid = (errors: FieldErrors<InvoiceFormValues>) => {
    console.error('--- VALIDARE EȘUATĂ ---', errors)
    toast.error('Formularul conține erori. Verificați datele introduse.')
  }

  const vatRateNumbers = vatRates.map((v) => v.rate)
  const defaultVat = defaultVatRate.rate

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className='space-y-6'
      >
        <div className='grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-5'>
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
            name='invoiceType'
            render={({ field }) => (
              <FormItem className='md:col-span-1'>
                <FormLabel>Tip Factură</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează tip' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUPPLIER_INVOICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {SUPPLIER_INVOICE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='invoiceSeries'
            render={({ field }) => (
              <FormItem className='md:col-span-1'>
                <FormLabel>Serie Factură</FormLabel>
                <FormControl>
                  <Input
                    placeholder='F-'
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
            name='invoiceNumber'
            render={({ field }) => (
              <FormItem className='md:col-span-1'>
                <FormLabel>Număr Factură</FormLabel>
                <FormControl>
                  <Input
                    placeholder='12345'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-3'>
          <FormField
            control={control}
            name='invoiceDate'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel>Data Facturii</FormLabel>
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
            control={control}
            name='dueDate'
            render={({ field }) => (
              <FormItem className='flex flex-col'>
                <FormLabel>Data Scadenței</FormLabel>
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
          <div className='flex flex-col gap-4 h-full'>
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
            <div className='flex flex-col justify-end p-4 space-y-1 text-sm rounded-md border bg-muted'>
              <p className='flex justify-between font-normal text-muted-foreground'>
                <span>Subtotal:</span>
                <span className='font-bold text-foreground'>
                  {formatCurrency(subtotal || 0)}
                </span>
              </p>
              <p className='flex justify-between font-normal text-muted-foreground'>
                <span>TVA:</span>
                <span className='font-bold text-foreground'>
                  {formatCurrency(vatTotal || 0)}
                </span>
              </p>
              <div className='pt-2 border-t border-border'></div>
              <p className='flex justify-between text-lg font-bold text-red-500'>
                <span>TOTAL GENERAL:</span>
                <span>{formatCurrency(grandTotal || 0)}</span>
              </p>
            </div>
          </div>
        </div>

        <SupplierInvoiceLineEditor
          control={control}
          unitsOfMeasure={UNITS as unknown as string[]}
          vatRates={vatRateNumbers}
          defaultVat={defaultVat}
        />
        <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>

        {/* --- MODIFICARE AICI: BUTONUL --- */}
        <Button type='submit' disabled={isSubmitting} className='w-full'>
          {isSubmitting ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          {initialData ? 'Actualizează Factura' : 'Salvează Factura'}
        </Button>
      </form>
    </Form>
  )
}
