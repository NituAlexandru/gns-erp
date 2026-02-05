'use client'

import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { useState, useEffect, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, RefreshCw, Calculator } from 'lucide-react'
import { ro } from 'date-fns/locale'
import { formatCurrency, formatDateTime, round2, cn } from '@/lib/utils'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_MAP,
} from '@/lib/db/modules/financial/treasury/payment.constants'
import { createClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { CreateClientPaymentSchema } from '@/lib/db/modules/financial/treasury/receivables/client-payment.validator'
import { SimpleClientSearch } from './SimpleClientSearch'
import { getNextReceiptNumberPreview } from '@/lib/db/modules/numbering/receipt-numbering.actions'
import { getUnpaidInvoicesByClient } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { getBNRRates } from '@/lib/finance/bnr.actions'

interface CreateClientPaymentFormProps {
  onFormSubmit: () => void
  initialClientId?: string
  initialClientName?: string
  initialAmount?: number
  initialNotes?: string
}

type FormValues = z.infer<typeof CreateClientPaymentSchema>

export function CreateClientPaymentForm({
  onFormSubmit,
  initialClientId,
  initialClientName,
  initialAmount,
  initialNotes,
}: CreateClientPaymentFormProps) {
  // --- STATE-URI ---
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]) // Array, nu Set
  const [isLoadingRate, setIsLoadingRate] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateClientPaymentSchema),
    defaultValues: {
      clientId: initialClientId || undefined,
      paymentDate: new Date(),
      totalAmount: initialAmount || 0,
      paymentMethod: 'ORDIN_DE_PLATA',
      seriesName: '',
      paymentNumber: '',
      referenceDocument: '',
      notes: initialNotes || '',
      // Valori Default Monedă
      currency: 'RON',
      exchangeRate: 1,
      originalCurrencyAmount: 0,
    },
  })

  // Destructurăm pentru acces ușor
  const { control, setValue } = form
  const { isSubmitting } = form.formState

  // --- WATCHERS ---
  const watchedClientId = useWatch({ control, name: 'clientId' })
  const watchedCurrency = useWatch({ control, name: 'currency' })
  const watchedOriginalAmount = useWatch({
    control,
    name: 'originalCurrencyAmount',
  })
  const watchedRate = useWatch({ control, name: 'exchangeRate' })
  const watchedTotalAmount = useWatch({ control, name: 'totalAmount' }) // Pt footer input

  const isForeignCurrency = watchedCurrency !== 'RON'

  // --- CALCUL TOTAL SELECTAT (Pt Footer - independent de input) ---
  const selectedInvoicesTotal = useMemo(() => {
    return invoices
      .filter((inv) => selectedInvoiceIds.includes(inv._id))
      .reduce((acc, inv) => acc + inv.remainingAmount, 0)
  }, [invoices, selectedInvoiceIds])

  // --- HELPER: Calcul Totaluri (Actualizează inputul de sus) ---
  const recalculateTotalFromSelection = (selectedIds: string[]) => {
    // Calculăm suma în LEI din selecție
    const totalRon = invoices
      .filter((inv) => selectedIds.includes(inv._id))
      .reduce((acc, inv) => acc + inv.remainingAmount, 0)

    const roundedRon = round2(totalRon)

    // Setăm inputul de LEI (baza)
    setValue('totalAmount', roundedRon, { shouldValidate: true })

    // Dacă e valută, calculăm invers (LEI -> Valută)
    if (isForeignCurrency) {
      const rate = form.getValues('exchangeRate') || 1
      if (rate > 0) {
        setValue('originalCurrencyAmount', round2(roundedRon / rate))
      }
    }
  }

  // --- LOGICĂ MONEDĂ ---

  // A. Auto-calcul (Valută -> Lei)
  useEffect(() => {
    if (isForeignCurrency) {
      const amount = Number(watchedOriginalAmount) || 0
      const rate = Number(watchedRate) || 0
      const ronTotal = round2(amount * rate)
      setValue('totalAmount', ronTotal, { shouldValidate: true })
    }
  }, [watchedOriginalAmount, watchedRate, isForeignCurrency, setValue])

  // B. Schimbare Monedă (Fetch BNR)
  const handleCurrencyChange = async (newCurrency: string) => {
    setValue('currency', newCurrency)

    if (newCurrency === 'RON') {
      setValue('exchangeRate', 1)
      setValue('originalCurrencyAmount', 0)
    } else {
      setIsLoadingRate(true)
      const result = await getBNRRates()
      setIsLoadingRate(false)

      if (result.success && result.data && result.data[newCurrency]) {
        const rate = result.data[newCurrency]
        setValue('exchangeRate', rate)
        toast.success(`Curs BNR: 1 ${newCurrency} = ${rate} RON`)

        // Recalculare inversă la schimbarea monedei
        const currentRon = form.getValues('totalAmount') || 0
        if (currentRon > 0) {
          setValue('originalCurrencyAmount', round2(currentRon / rate))
        }
      } else {
        toast.warning('Introdu cursul manual.')
        setValue('exchangeRate', 0)
      }
    }
  }

  // --- EFFECT: Numerotare Automată ---
  useEffect(() => {
    let isMounted = true
    const fetchNumber = async () => {
      if (!form.getValues('paymentNumber')) {
        const nextNum = await getNextReceiptNumberPreview()
        if (isMounted && nextNum) {
          setValue('paymentNumber', nextNum)
        }
      }
    }
    fetchNumber()
    return () => {
      isMounted = false
    }
  }, [form, setValue])

  // --- EFFECT: Props Inițiale ---
  useEffect(() => {
    if (initialClientId) {
      setValue('clientId', initialClientId)
    }
    if (initialAmount) setValue('totalAmount', initialAmount)
    if (initialNotes) setValue('notes', initialNotes)
  }, [initialClientId, initialAmount, initialNotes, setValue])

  // --- EFFECT: Fetch Facturi ---
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!watchedClientId) {
        setInvoices([])
        setSelectedInvoiceIds([])
        return
      }

      setIsLoadingInvoices(true)
      const result = await getUnpaidInvoicesByClient(watchedClientId)
      setIsLoadingInvoices(false)

      if (result.success && result.data) {
        setInvoices(result.data)

        // LOGICĂ PRE-SELECTARE:
        if (initialAmount && result.data.length > 0) {
          const matchingInvoice = result.data.find(
            (inv: any) => Math.abs(inv.remainingAmount - initialAmount) < 0.01,
          )

          if (matchingInvoice) {
            const autoSelect = [matchingInvoice._id]
            setSelectedInvoiceIds(autoSelect)
          } else {
            setSelectedInvoiceIds([])
          }
        } else {
          setSelectedInvoiceIds([])
        }
      } else {
        toast.error('Nu s-au putut încărca facturile clientului.')
        setInvoices([])
      }
    }

    fetchInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedClientId])

  // --- LOGICĂ: Selecție (Array based) ---
  const toggleInvoice = (invoiceId: string) => {
    let newIds: string[] = []
    if (selectedInvoiceIds.includes(invoiceId)) {
      newIds = selectedInvoiceIds.filter((id) => id !== invoiceId)
    } else {
      newIds = [...selectedInvoiceIds, invoiceId]
    }
    setSelectedInvoiceIds(newIds)
    recalculateTotalFromSelection(newIds)
  }

  const toggleSelectAll = (checked: boolean) => {
    let newIds: string[] = []
    if (checked) {
      newIds = invoices.map((inv) => inv._id)
    }
    setSelectedInvoiceIds(newIds)
    recalculateTotalFromSelection(newIds)
  }

  async function onSubmit(data: FormValues) {
    try {
      const dataWithNumberAmount = {
        ...data,
        totalAmount: Number(data.totalAmount),
        selectedInvoiceIds: selectedInvoiceIds, // Array direct
        // Date valută
        originalCurrencyAmount: isForeignCurrency
          ? Number(data.originalCurrencyAmount)
          : undefined,
        exchangeRate: isForeignCurrency ? Number(data.exchangeRate) : 1,
      }

      const result = await createClientPayment(dataWithNumberAmount)

      if (result.success) {
        toast.success(result.message)
        onFormSubmit()
        form.reset()
      } else {
        toast.error('Eroare la salvare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
  }

  // Verificăm dacă sunt toate selectate pentru checkbox-ul din header
  const isAllSelected =
    invoices.length > 0 &&
    invoices.every((inv) => selectedInvoiceIds.includes(inv._id))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* === RÂNDUL 1: CLIENT + DOC DETALII === */}
        <div className='grid grid-cols-12 gap-4'>
          {/* Client (lat) */}
          <div className='col-span-12 md:col-span-4'>
            <FormField
              control={control}
              name='clientId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <FormControl>
                    <SimpleClientSearch
                      value={field.value}
                      onChange={field.onChange}
                      defaultName={initialClientName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Serie (îngust) */}
          <div className='col-span-6 md:col-span-2'>
            <FormField
              control={control}
              name='seriesName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serie (Opțional)</FormLabel>
                  <FormControl>
                    <Input placeholder='ex: CH' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Număr (îngust) */}
          <div className='col-span-6 md:col-span-3'>
            <FormField
              control={control}
              name='paymentNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Număr (Obligatoriu)</FormLabel>
                  <FormControl>
                    <Input placeholder='00001' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Referință (mediu) */}
          <div className='col-span-12 md:col-span-3'>
            <FormField
              control={control}
              name='referenceDocument'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referință (Opțional)</FormLabel>
                  <FormControl>
                    <Input placeholder='Detalii...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* === RÂNDUL 2: MONEDĂ, SUME & METODĂ === */}
        <div className='bg-muted/10 p-3 rounded-lg border space-y-4'>
          <div className='grid grid-cols-12 gap-3'>
            {/* 1. SELECTOR MONEDĂ */}
            <div className='col-span-6 md:col-span-2'>
              <FormField
                control={control}
                name='currency'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>Monedă</FormLabel>
                    <Select
                      onValueChange={(val) => handleCurrencyChange(val)}
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

            {/* 2. CÂMPURI VALUTĂ (Apar doar dacă NU e RON) */}
            {isForeignCurrency && (
              <>
                <div className='col-span-6 md:col-span-2'>
                  <FormField
                    control={control}
                    name='originalCurrencyAmount'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs'>
                          Sumă ({watchedCurrency})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            step='0.01'
                            className='bg-background font-semibold border-primary h-9'
                            placeholder='0.00'
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

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
              </>
            )}

            {/* 3. INPUTUL DE LEI (Readonly pe valută) */}
            <div
              className={
                isForeignCurrency
                  ? 'col-span-6 md:col-span-3'
                  : 'col-span-6 md:col-span-5'
              }
            >
              <FormField
                control={control}
                name='totalAmount'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex justify-between items-center'>
                      <FormLabel className='text-xs'>
                        {isForeignCurrency ? 'Echivalent (LEI)' : 'Sumă (LEI)'}
                      </FormLabel>
                      {isForeignCurrency && (
                        <span className='text-[10px] text-muted-foreground bg-muted px-1 rounded'>
                          Auto
                        </span>
                      )}
                    </div>
                    <div className='relative'>
                      <Input
                        type='number'
                        step='0.01'
                        placeholder='0.00'
                        readOnly={isForeignCurrency} // AICI E CHEIA
                        className={`font-bold text-lg h-9 ${isForeignCurrency ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-background'}`}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                      {/* Buton Recalculare (Doar RON) */}
                      {!isForeignCurrency && selectedInvoiceIds.length > 0 && (
                        <div
                          className='absolute right-2 top-2.5 cursor-pointer text-muted-foreground hover:text-foreground'
                          onClick={() =>
                            recalculateTotalFromSelection(selectedInvoiceIds)
                          }
                          title='Recalculează din selecție'
                        >
                          <RefreshCw className='h-4 w-4' />
                        </div>
                      )}
                      {isForeignCurrency && (
                        <Calculator className='absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50' />
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 4. METODA PLATA */}
            <div
              className={
                isForeignCurrency
                  ? 'col-span-12 md:col-span-3'
                  : 'col-span-12 md:col-span-5'
              }
            >
              <FormField
                control={control}
                name='paymentMethod'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs'>Metodă Plată</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='bg-background h-9'>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {PAYMENT_METHOD_MAP[m].name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* === RÂNDUL 3: DATA & NOTIȚE === */}
        <div className='grid grid-cols-1 md:grid-cols-12 gap-8'>
          {/* Calendar */}
          <div className='col-span-12 md:col-span-5'>
            <FormField
              control={control}
              name='paymentDate'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Data Încasării</FormLabel>
                  <FormControl>
                    <div className='border rounded-md p-0 w-fit overflow-hidden'>
                      <Calendar
                        mode='single'
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ro}
                        className='p-2'
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Notițe */}
          <div className='col-span-12 md:col-span-7 flex flex-col'>
            <FormField
              control={control}
              name='notes'
              render={({ field }) => (
                <FormItem className='h-full'>
                  <FormLabel>Notițe</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Observații...'
                      {...field}
                      className='h-[280px] resize-none'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10'
        >
          {isSubmitting ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          Salvează Încasarea
        </Button>

        {/* === SECȚIUNEA DE JOS: LISTA FACTURI === */}
        {watchedClientId && (
          <div className='border border-input rounded-xl overflow-hidden mt-4 shadow-sm bg-card'>
            <div className='bg-muted/30 p-4 border-b flex gap-4'>
              <div className='col-span-1 flex items-center'>
                <Checkbox
                  className='cursor-pointer'
                  checked={
                    invoices.length > 0 &&
                    invoices.every((inv) =>
                      selectedInvoiceIds.includes(inv._id),
                    )
                  }
                  onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                />
              </div>
              <h3 className='text-sm font-semibold'>
                Selectează Facturi pentru Încasare
              </h3>
            </div>

            <div className='bg-muted/10 p-3 px-4 flex justify-between items-center border-b'>
              <span className='text-sm text-muted-foreground'>
                {selectedInvoiceIds.length} facturi selectate
              </span>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>Total:</span>
                <span className='text-lg font-bold text-red-600'>
                  {formatCurrency(selectedInvoicesTotal)}
                </span>
              </div>
            </div>

            <div className='max-h-[1000px] overflow-y-auto bg-background'>
              {isLoadingInvoices ? (
                <div className='p-8 flex justify-center items-center text-muted-foreground'>
                  <Loader2 className='h-5 w-5 animate-spin mr-2' /> Se încarcă
                  facturile...
                </div>
              ) : invoices.length === 0 ? (
                <div className='p-8 text-center text-sm text-muted-foreground'>
                  Nu există facturi neîncasate pentru acest client.
                </div>
              ) : (
                <div className='w-full'>
                  <div className='grid grid-cols-12 gap-2 px-4 py-2 border-b text-xs font-medium text-muted-foreground'>
                    <div className='col-span-1'></div>
                    <div className='col-span-4'>Factură</div>
                    <div className='col-span-2 text-right'>Data Fact.</div>
                    <div className='col-span-2 text-right'>Scadență</div>
                    <div className='col-span-3 text-right'>Rest de Încasat</div>
                  </div>

                  {/* Rânduri Tabel */}
                  {invoices.map((inv) => {
                    const isSelected = selectedInvoiceIds.includes(inv._id)
                    const isOverdue =
                      new Date(inv.dueDate) < new Date() &&
                      inv.remainingAmount > 0

                    return (
                      <div
                        key={inv._id}
                        className={`grid grid-cols-12 gap-2 px-4 py-3 border-b last:border-0 items-center hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted/20' : ''}`}
                      >
                        <div className='col-span-1 flex items-center'>
                          <Checkbox
                            className='cursor-pointer'
                            checked={isSelected}
                            onCheckedChange={() => toggleInvoice(inv._id)}
                          />
                        </div>
                        <div className='col-span-4  font-medium'>
                          {inv.seriesName} - {inv.invoiceNumber}
                        </div>
                        <div className='col-span-2 text-right text-muted-foreground'>
                          {inv.invoiceDate
                            ? formatDateTime(new Date(inv.invoiceDate)).dateOnly
                            : '-'}
                        </div>
                        <div
                          className={`col-span-2 text-right font-medium ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}
                        >
                          {inv.dueDate
                            ? formatDateTime(new Date(inv.dueDate)).dateOnly
                            : '-'}
                        </div>
                        <div className='col-span-3 text-right font-bold text-foreground'>
                          {formatCurrency(inv.remainingAmount)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </Form>
  )
}
