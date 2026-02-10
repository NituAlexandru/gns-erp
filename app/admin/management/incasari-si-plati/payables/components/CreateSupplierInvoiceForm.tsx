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
import { formatCurrency, round2, round6 } from '@/lib/utils'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
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
import { getBNRRates } from '@/lib/finance/bnr.actions'

// Extindem schema pentru a include câmpurile de monedă în formular
const FormInputSchema = CreateSupplierInvoiceSchema.pick({
  supplierId: true,
  invoiceType: true,
  invoiceSeries: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  items: true,
  notes: true,
  invoiceCurrency: true,
  originalCurrency: true,
  exchangeRate: true,
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
          invoiceCurrency: initialData.invoiceCurrency || 'RON',
          originalCurrency: initialData.originalCurrency || 'RON',
          exchangeRate: initialData.exchangeRate || 1,
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
          invoiceCurrency: 'RON',
          exchangeRate: 1,
        },
  })

  const { isSubmitting } = form.formState
  const { control, setValue, getValues } = form

  // --- Watchers & Monedă ---
  const watchedItems = useWatch({ control, name: 'items' })
  const watchedCurrency = useWatch({ control, name: 'originalCurrency' })
  const watchedRate = useWatch({ control, name: 'exchangeRate' })
  const isForeignCurrency = watchedCurrency !== 'RON'
  const [isLoadingRate, setIsLoadingRate] = useState(false)

  // Stare pentru totaluri vizuale (RON vs Foreign)
  const [displayTotals, setDisplayTotals] = useState({
    ron: 0,
    foreign: 0,
    subtotalRon: 0,
    vatRon: 0,
  })

  // --- LOGICĂ SCHIMBARE MONEDĂ ---
  const handleCurrencyChange = async (newCurrency: string) => {
    setValue('originalCurrency', newCurrency)
    setValue('invoiceCurrency', 'RON')

    if (newCurrency === 'RON') {
      setValue('exchangeRate', 1)
      // Când revenim la RON, e bine să recalculăm vizual sau să lăsăm utilizatorul să editeze
    } else {
      setIsLoadingRate(true)
      const result = await getBNRRates()
      setIsLoadingRate(false)

      if (result.success && result.data && result.data[newCurrency]) {
        const rate = result.data[newCurrency]
        setValue('exchangeRate', rate)
        toast.success(`Curs BNR: 1 ${newCurrency} = ${rate} RON`)

        // Recalculăm automat prețurile în RON pentru liniile existente
        const currentItems = getValues('items')
        currentItems.forEach((item, index) => {
          if (item.originalCurrencyAmount) {
            const newRonPrice = round6(item.originalCurrencyAmount * rate)
            setValue(`items.${index}.unitPrice`, newRonPrice)
          }
        })
      } else {
        toast.warning('Introdu cursul manual.')
        setValue('exchangeRate', 0)
      }
    }
  }

  // Recalcul automat la schimbarea manuală a cursului
  useEffect(() => {
    if (isForeignCurrency && watchedRate > 0) {
      const currentItems = getValues('items')
      currentItems.forEach((item, index) => {
        if (item.originalCurrencyAmount) {
          const newRonPrice = round6(item.originalCurrencyAmount * watchedRate)
          setValue(`items.${index}.unitPrice`, newRonPrice)
        }
      })
    }
  }, [watchedRate, isForeignCurrency, getValues, setValue])

  // --- CALCUL TOTALURI (VIZUAL) ---
  useEffect(() => {
    if (!watchedItems) return
    let totalSubtotalRon = 0
    let totalVatRon = 0
    let totalForeign = 0

    watchedItems.forEach((item) => {
      // 1. Calcul RON Standard (Asta se salvează ca bază)
      const q = item.quantity || 0
      const pRon = item.unitPrice || 0
      const vatRate = item.vatRateDetails.rate || 0

      const lineValRon = round2(q * pRon)
      const lineVatRon = round2(lineValRon * (vatRate / 100))

      totalSubtotalRon += lineValRon
      totalVatRon += lineVatRon

      // 2. Calcul Foreign (Asta e doar pentru afișare/referință)
      if (isForeignCurrency) {
        const pForeign = item.originalCurrencyAmount || 0
        const lineValForeign = round2(q * pForeign)
        const vatValForeign = round2(lineValForeign * (vatRate / 100))
        totalForeign += round2(lineValForeign + vatValForeign)
      }
    })

    const grandTotalRon = round2(totalSubtotalRon + totalVatRon)

    setDisplayTotals({
      ron: grandTotalRon,
      foreign: totalForeign,
      subtotalRon: totalSubtotalRon,
      vatRon: totalVatRon,
    })
  }, [watchedItems, isForeignCurrency])

  if (!defaultVatRate) {
    return (
      <div className='flex items-center justify-center h-full p-8 text-center'>
        <p className='text-lg font-semibold text-red-500'>
          Eroare Critică: Cota TVA implicită nu este setată în sistem.
        </p>
      </div>
    )
  }

  // --- SUBMIT ---
  async function onSubmit(data: InvoiceFormValues) {
    try {
      const selectedSupplier = suppliers.find((s) => s._id === data.supplierId)
      if (!selectedSupplier) {
        toast.error('Furnizorul selectat nu a fost găsit.')
        return
      }

      const supplierAddress = selectedSupplier.address || {}

      // 1. Snapshot Furnizor
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

      // 2. Liniile Finale (Calcul corect RON + Valută opțional)
      const finalItems = data.items.map((item) => {
        // RON
        const lineValue = round2((item.quantity || 0) * (item.unitPrice || 0))
        const vatValue = round2(
          lineValue * ((item.vatRateDetails.rate || 0) / 100),
        )

        return {
          ...item,
          // RON Fields
          lineValue: lineValue,
          vatRateDetails: { ...item.vatRateDetails, value: vatValue },
          lineTotal: round2(lineValue + vatValue),

          // Foreign Fields (Optional)
          originalCurrencyAmount: isForeignCurrency
            ? item.originalCurrencyAmount
            : undefined,
        }
      })

      // 3. Totaluri Finale (Structura Backend)
      const finalTotals = {
        subtotal: displayTotals.subtotalRon,
        vatTotal: displayTotals.vatRon,
        grandTotal: displayTotals.ron, // BAZA DE DATE VEDE DOAR RON CA SUMA PRINCIPALA

        // Salvăm totalul în valută doar informativ
        originalCurrencyTotal: isForeignCurrency
          ? displayTotals.foreign
          : undefined,

        productsSubtotal: displayTotals.subtotalRon,
        productsVat: displayTotals.vatRon,
        packagingSubtotal: 0,
        packagingVat: 0,
        servicesSubtotal: 0,
        servicesVat: 0,
        manualSubtotal: 0,
        manualVat: 0,
      }

      const payload = {
        ...data,
        invoiceCurrency: 'RON',
        originalCurrency: data.originalCurrency,
        items: finalItems,
        totals: finalTotals,
        supplierSnapshot: supplierSnapshot,
      }

      const validation = CreateSupplierInvoiceSchema.safeParse(payload)
      if (!validation.success) {
        console.error('Eroare validare payload final:', validation.error.errors)
        toast.error('Eroare la validarea datelor finale înainte de trimitere.')
        return
      }

      let result
      if (initialData) {
        result = await updateSupplierInvoice(initialData._id, validation.data)
      } else {
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
        {/* RÂND 1: Furnizor, Tip, Serie */}
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

        {/* --- RÂND 2: MONEDĂ & CURS (IDENTIC CU PLĂȚI) --- */}
        <div className='bg-muted/10 p-3 rounded-lg border space-y-4'>
          <div className='grid grid-cols-12 gap-3'>
            {/* 1. SELECTOR MONEDĂ */}
            <div className='col-span-6 md:col-span-2'>
              <FormField
                control={control}
                name='originalCurrency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>Monedă</FormLabel>
                    <Select
                      onValueChange={handleCurrencyChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='bg-background h-9'>
                          <SelectValue placeholder='RON' />
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
            </div>

            {/* 2. CURS (Doar dacă e valută) */}
            {isForeignCurrency && (
              <div className='col-span-6 md:col-span-2'>
                <FormField
                  control={control}
                  name='exchangeRate'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs'>Curs</FormLabel>
                      <div className='relative'>
                        <Input
                          type='number'
                          step='0.0001'
                          className='bg-background pr-7 h-9'
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                        {isLoadingRate && (
                          <Loader2 className='absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground' />
                        )}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* RÂND 3: Date & Note & Totaluri */}
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

            {/* ZONA TOTALURI (Actualizată) */}
            <div className='flex flex-col justify-end p-4 space-y-1 text-sm rounded-md border bg-muted'>
              {isForeignCurrency && (
                <p className='flex justify-between font-normal text-muted-foreground border-b pb-2 mb-2'>
                  <span>Total {watchedCurrency}:</span>
                  <span className='font-bold text-foreground'>
                    {displayTotals.foreign.toLocaleString('ro-RO', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {watchedCurrency}
                  </span>
                </p>
              )}

              <p className='flex justify-between font-normal text-muted-foreground'>
                <span>Subtotal (RON):</span>
                <span className='font-bold text-foreground'>
                  {formatCurrency(displayTotals.subtotalRon)}{' '}
                </span>
              </p>
              <p className='flex justify-between font-normal text-muted-foreground'>
                <span>TVA (RON):</span>
                <span className='font-bold text-foreground'>
                  {formatCurrency(displayTotals.vatRon)}
                </span>
              </p>
              <div className='pt-2 border-t border-border'></div>
              <p className='flex justify-between text-lg font-bold text-red-500'>
                <span>TOTAL GENERAL:</span>
                <span>{formatCurrency(displayTotals.ron)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* EDITOR LINII - TRIMITEM PROPS COMPLETE PENTRU LOGICA MONEDEI */}
        <SupplierInvoiceLineEditor
          control={control}
          setValue={setValue}
          unitsOfMeasure={UNITS as unknown as string[]}
          vatRates={vatRateNumbers}
          defaultVat={defaultVat}
          invoiceCurrency={watchedCurrency}
          exchangeRate={watchedRate}
        />
        <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>

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
