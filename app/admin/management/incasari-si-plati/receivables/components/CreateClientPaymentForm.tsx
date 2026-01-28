'use client'

import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
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
import { Loader2, RefreshCw } from 'lucide-react'
import { ro } from 'date-fns/locale'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_MAP,
} from '@/lib/db/modules/financial/treasury/payment.constants'
import { createClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { CreateClientPaymentSchema } from '@/lib/db/modules/financial/treasury/receivables/client-payment.validator'
import { SimpleClientSearch } from './SimpleClientSearch'
import { getNextReceiptNumberPreview } from '@/lib/db/modules/numbering/receipt-numbering.actions'
import { getUnpaidInvoicesByClient } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'

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
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)

  // Set de ID-uri selectate
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(
    new Set(),
  )

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
    },
  })

  // Hook pentru performanță
  const watchedClientId = useWatch({
    control: form.control,
    name: 'clientId',
  })

  const { isSubmitting } = form.formState

  // --- EFFECT: Numerotare Automată ---
  useEffect(() => {
    let isMounted = true
    const fetchNumber = async () => {
      if (!form.getValues('paymentNumber')) {
        const nextNum = await getNextReceiptNumberPreview()
        if (isMounted && nextNum) {
          form.setValue('paymentNumber', nextNum)
        }
      }
    }
    fetchNumber()
    return () => {
      isMounted = false
    }
  }, [form])

  // --- EFFECT: Props Inițiale ---
  useEffect(() => {
    // Setăm valorile inițiale când se deschide modalul
    if (initialClientId) {
      form.setValue('clientId', initialClientId)
    }
    if (initialAmount) form.setValue('totalAmount', initialAmount)
    if (initialNotes) form.setValue('notes', initialNotes)
  }, [initialClientId, initialAmount, initialNotes, form])

  // --- EFFECT: Fetch Facturi ---
  useEffect(() => {
    const fetchInvoices = async () => {
      // Dacă nu avem client selectat, golim lista și selecția
      if (!watchedClientId) {
        setInvoices([])
        setSelectedInvoiceIds(new Set())
        return
      }

      setIsLoadingInvoices(true)
      const result = await getUnpaidInvoicesByClient(watchedClientId)
      setIsLoadingInvoices(false)

      if (result.success && result.data) {
        setInvoices(result.data)

        // LOGICĂ PRE-SELECTARE:
        // Dacă avem o sumă inițială (venim din butonul "Încasează"),
        // încercăm să găsim factura cu acea sumă și să o bifăm automat.
        if (initialAmount && result.data.length > 0) {
          // Căutăm factura cu o toleranță mică pentru floating point
          const matchingInvoice = result.data.find(
            (inv: any) => Math.abs(inv.remainingAmount - initialAmount) < 0.01,
          )

          if (matchingInvoice) {
            const autoSelect = new Set<string>()
            autoSelect.add(matchingInvoice._id)
            setSelectedInvoiceIds(autoSelect)
          } else {
            setSelectedInvoiceIds(new Set())
          }
        } else {
          // Reset normal dacă nu e caz de pre-fill
          setSelectedInvoiceIds(new Set())
        }
      } else {
        toast.error('Nu s-au putut încărca facturile clientului.')
        setInvoices([])
      }
    }

    fetchInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedClientId])

  // --- LOGICĂ: Toggle Factură Individuală ---
  const toggleInvoice = (invoiceId: string) => {
    const newSelected = new Set(selectedInvoiceIds)
    if (newSelected.has(invoiceId)) {
      newSelected.delete(invoiceId)
    } else {
      newSelected.add(invoiceId)
    }
    setSelectedInvoiceIds(newSelected)
    recalculateTotal(newSelected)
  }

  // --- LOGICĂ: Select All ---
  const toggleSelectAll = () => {
    if (selectedInvoiceIds.size === invoices.length && invoices.length > 0) {
      // Deselectăm tot
      setSelectedInvoiceIds(new Set())
      recalculateTotal(new Set())
    } else {
      // Selectăm tot
      const allIds = new Set(invoices.map((inv) => inv._id))
      setSelectedInvoiceIds(allIds)
      recalculateTotal(allIds)
    }
  }

  // --- LOGICĂ: Recalculare Total ---
  const recalculateTotal = (selectedIds: Set<string>) => {
    let newTotal = 0
    invoices.forEach((inv) => {
      if (selectedIds.has(inv._id)) {
        newTotal += inv.remainingAmount
      }
    })
    newTotal = Math.round(newTotal * 100) / 100
    form.setValue('totalAmount', newTotal)
  }

  async function onSubmit(data: FormValues) {
    try {
      const dataWithNumberAmount = {
        ...data,
        totalAmount: Number(data.totalAmount),
        selectedInvoiceIds: Array.from(selectedInvoiceIds),
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
    invoices.length > 0 && selectedInvoiceIds.size === invoices.length

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* === RÂNDUL 1: CLIENT + DOC DETALII === */}
        <div className='grid grid-cols-12 gap-4'>
          {/* Client (lat) */}
          <div className='col-span-12 md:col-span-4'>
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
              control={form.control}
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
              control={form.control}
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
              control={form.control}
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

        {/* === RÂNDUL 2: SUMA & METODA === */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-end'>
          <FormField
            control={form.control}
            name='totalAmount'
            render={({ field }) => (
              <FormItem>
                <div className='flex justify-between items-center'>
                  <FormLabel>Sumă Încasată</FormLabel>
                  {selectedInvoiceIds.size > 0 && (
                    <span className='text-green-500 text-xs font-normal'>
                      (Calculat din {selectedInvoiceIds.size} facturi)
                    </span>
                  )}
                </div>
                <FormControl>
                  <div className='relative'>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      className='font-bold pr-8 text-lg'
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                    <div
                      className='absolute right-2.5 top-3 cursor-pointer text-muted-foreground hover:text-foreground'
                      onClick={() => recalculateTotal(selectedInvoiceIds)}
                    ></div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
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
                      <SelectValue placeholder='Selectează...' />
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

        {/* === RÂNDUL 3: DATA & NOTIȚE === */}
        <div className='grid grid-cols-1 md:grid-cols-12 gap-8'>
          {/* Calendar - DESIGN REPARAT (Fără w-full) */}
          <div className='col-span-12 md:col-span-5'>
            <FormField
              control={form.control}
              name='paymentDate'
              render={({ field }) => (
                <FormItem className='flex flex-col'>
                  <FormLabel>Data Încasării</FormLabel>
                  <FormControl>
                    {/* Container care strânge calendarul */}
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
              control={form.control}
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
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </div>
              <h3 className='text-sm font-semibold'>
                Selectează Facturi pentru Încasare
              </h3>
            </div>

            <div className='bg-muted/10 p-3 px-4 flex justify-between items-center border-b'>
              <span className='text-sm text-muted-foreground'>
                {selectedInvoiceIds.size} facturi selectate
              </span>
              <div className='flex items-center gap-2'>
                <span className='text-sm text-muted-foreground'>Total:</span>
                <span className='text-lg font-bold text-red-600'>
                  {formatCurrency(form.getValues('totalAmount') || 0)}
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
                    const isSelected = selectedInvoiceIds.has(inv._id)
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
