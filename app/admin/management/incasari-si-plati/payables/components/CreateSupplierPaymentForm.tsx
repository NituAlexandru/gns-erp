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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, AlertCircle, Copy } from 'lucide-react'
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
import { formatCurrency, formatDateTime, round2, cn } from '@/lib/utils' // <-- round2 importat
import { useEffect, useMemo, useState } from 'react'
import { IBudgetCategoryTree } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.types'
import { getUnpaidSupplierInvoices } from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'
import { UnpaidSupplierInvoice } from './SupplierAllocationModal'
import { getNextPaymentNumberPreview } from '@/lib/db/modules/numbering/payment-numbering.actions'

interface CreateSupplierPaymentFormProps {
  suppliers: ISupplierDoc[]
  onFormSubmit: () => void
  budgetCategories: IBudgetCategoryTree[]
  initialSupplierId?: string
  initialInvoiceId?: string
}

type FormValues = z.infer<typeof CreateSupplierPaymentFormSchema>

export function CreateSupplierPaymentForm({
  suppliers,
  onFormSubmit,
  budgetCategories,
  initialSupplierId,
  initialInvoiceId,
}: CreateSupplierPaymentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(CreateSupplierPaymentFormSchema),
    defaultValues: {
      supplierId: initialSupplierId || '',
      paymentDate: new Date(),
      totalAmount: 0,
      paymentMethod: 'ORDIN_DE_PLATA',
      seriesName: '',
      paymentNumber: '',
      referenceDocument: '',
      mainCategoryId: undefined,
      subCategoryId: undefined,
    },
  })

  const { isSubmitting } = form.formState
  const { control, setValue } = form

  // --- STATE-URI NOI ---
  const [allInvoices, setAllInvoices] = useState<UnpaidSupplierInvoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  // Selecție (folosim un Set pentru performanță, dar îl convertim la array pt calcule)
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])

  // Watchers
  const watchedSupplierId = useWatch({ control, name: 'supplierId' })
  const watchedMainCategory = useWatch({ control, name: 'mainCategoryId' })

  useEffect(() => {
    // Rulăm doar dacă avem facturi încărcate și un ID inițial de selectat
    if (allInvoices.length > 0 && initialInvoiceId) {
      const targetInvoice = allInvoices.find(
        (inv) => inv._id === initialInvoiceId,
      )

      if (targetInvoice) {
        // 1. O adăugăm la lista de ID-uri selectate
        setSelectedInvoiceIds([targetInvoice._id])

        // 2. Setăm suma totală cu restul de plată al acelei facturi
        setValue('totalAmount', round2(targetInvoice.remainingAmount))

        // Opțional: Putem seta și o notiță automată
        // setValue('notes', `Plată pentru factura ${targetInvoice.invoiceNumber}`)
      }
    }
  }, [allInvoices, initialInvoiceId, setValue])

  // 1. FETCH FACTURI
  useEffect(() => {
    if (!watchedSupplierId) {
      setAllInvoices([])
      setSelectedInvoiceIds([])
      return
    }

    const fetchInvoices = async () => {
      setLoadingInvoices(true)
      try {
        const res = await getUnpaidSupplierInvoices(watchedSupplierId)
        if (res.success) {
          setAllInvoices(res.data)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoadingInvoices(false)
        // Resetăm selecția și filtrele la schimbarea furnizorului
        setSelectedInvoiceIds([])
        setValue('totalAmount', 0)
      }
    }

    fetchInvoices()
  }, [watchedSupplierId, setValue])

  useEffect(() => {
    let isMounted = true

    const fetchNumber = async () => {
      // Doar dacă câmpul e gol (ca să nu suprascriem dacă userul a scris deja ceva și a redeschis)
      if (!form.getValues('paymentNumber')) {
        const nextNum = await getNextPaymentNumberPreview()
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

  // --- NOU: Generare text pentru OP ---
  const paymentDetailsText = useMemo(() => {
    if (selectedInvoiceIds.length === 0)
      return 'Selectează facturi pentru a genera detaliile...'

    const selectedInvoices = allInvoices.filter((inv) =>
      selectedInvoiceIds.includes(inv._id),
    )

    // Construim lista: "F-1001/12.01.2026"
    const details = selectedInvoices
      .map((inv) => {
        const series = inv.invoiceSeries ? `${inv.invoiceSeries}-` : ''
        return `${series}${inv.invoiceNumber}`
      })
      .join(', ')

    return `Conf. fact: ${details}`
  }, [selectedInvoiceIds, allInvoices])

  const handleCopyDetails = () => {
    if (!paymentDetailsText || selectedInvoiceIds.length === 0) return
    navigator.clipboard.writeText(paymentDetailsText)
    toast.success('Detaliile de plată au fost copiate în clipboard!')
  }

  // 3. LOGICA DE SELECȚIE
  const handleToggleInvoice = (invoiceId: string) => {
    // 1. Calculăm noua listă de ID-uri
    let newIds: string[] = []
    if (selectedInvoiceIds.includes(invoiceId)) {
      newIds = selectedInvoiceIds.filter((id) => id !== invoiceId)
    } else {
      newIds = [...selectedInvoiceIds, invoiceId]
    }

    // 2. Actualizăm starea vizuală (bifele)
    setSelectedInvoiceIds(newIds)

    // 3. Calculăm și setăm suma imediat
    const totalSelected = allInvoices
      .filter((inv) => newIds.includes(inv._id))
      // Folosim round2 la fiecare adunare sau la final pentru siguranță
      .reduce((acc, inv) => acc + inv.remainingAmount, 0)

    // Rotunjim finalul la 2 zecimale
    setValue('totalAmount', round2(totalSelected))
  }

  const handleSelectAll = (checked: boolean) => {
    let newIds: string[] = []

    if (checked) {
      //  Folosim direct allInvoices
      newIds = allInvoices.map((inv) => inv._id)
    } else {
      newIds = []
    }

    setSelectedInvoiceIds(newIds)

    const totalSelected = allInvoices
      .filter((inv) => newIds.includes(inv._id))
      .reduce((acc, inv) => acc + inv.remainingAmount, 0)

    setValue('totalAmount', round2(totalSelected))
  }

  // Subcategorii (existent)
  const subCategories = useMemo(() => {
    if (!watchedMainCategory) return []
    const selectedCategory = budgetCategories.find(
      (cat) => cat._id === watchedMainCategory,
    )
    return selectedCategory?.children || []
  }, [watchedMainCategory, budgetCategories])

  useEffect(() => {
    setValue('subCategoryId', undefined)
  }, [watchedMainCategory, setValue])

  // Submit Logic (Existent)
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
    console.error(errors)
    toast.error('Formularul de plată conține erori.')
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        className='space-y-6'
      >
        {/* --- FORMULARUL DE BAZĂ  --- */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
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
                <FormLabel>Serie (Opțional)</FormLabel>
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
            name='paymentNumber'
            render={({ field }) => (
              <FormItem className='md:col-span-1'>
                <FormLabel>Număr (Obligatoriu)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='ex: 1001'
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
                <FormLabel>Referință (Opțional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Detalii...'
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField
            control={control}
            name='totalAmount'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='flex justify-between items-center'>
                  <span>Sumă Plătită</span>
                  {selectedInvoiceIds.length > 0 && (
                    <span className='text-xs text-green-600 font-medium animate-pulse'>
                      (Calculat din {selectedInvoiceIds.length} facturi)
                    </span>
                  )}
                </FormLabel>
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

        <div className='grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6'>
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

          {/* --- ZONA MIJLOC: CATEGORII + DETALII OP --- */}
          <div className='flex flex-col gap-4'>
            {/* 1. Selector Categorie (Existent) */}
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
                        <SelectValue placeholder='Selectează categoria...' />
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

            {/* 2. Selector Subcategorie (Existent) */}
            {subCategories.length > 0 && (
              <FormField
                control={control}
                name='subCategoryId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategorie Buget</FormLabel>
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

            {/* 3.  GENERATOR DETALII OP --- */}
            <div className='pt-2 mt-auto'>
              <FormLabel className='text-xs text-muted-foreground font-medium mb-1.5 block'>
                Detalii Plată (Copy-Paste în OP)
              </FormLabel>
              <div className='flex gap-2'>
                <Textarea
                  readOnly
                  value={paymentDetailsText}
                  className='h-20 text-xs resize-none bg-muted/30 text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 font-mono'
                />
                <Button
                  type='button' 
                  variant='outline'
                  size='icon'
                  className='h-20 w-12 shrink-0 border-dashed hover:border-solid hover:bg-muted'
                  onClick={handleCopyDetails}
                  disabled={selectedInvoiceIds.length === 0}
                  title='Copiază textul'
                >
                  <Copy className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>

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

        <Button type='submit' disabled={isSubmitting} className='w-full'>
          {isSubmitting ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          Salvează Plata
        </Button>

        {/* --- LISTA INTERACTIVĂ DE FACTURI NEPLĂTITE --- */}
        {watchedSupplierId && (
          <Card className='mt-1 bg-muted/20 border-dashed gap-2'>
            <CardHeader className='pb-0 mb-0'>
              <CardTitle className='text-sm font-medium flex justify-between items-center gap-2'>
                <div className='flex items-center gap-1'>
                  <span>Selectează Facturi pentru Plată</span>
                  {loadingInvoices && (
                    <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                  )}
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {allInvoices.length > 0 ? (
                <div className='space-y-4'>
                  <div className='flex justify-between items-center p-3 bg-background border rounded-md shadow-sm'>
                    <span className='text-sm text-muted-foreground font-medium'>
                      {selectedInvoiceIds.length} facturi selectate
                    </span>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm text-muted-foreground'>
                        Total:
                      </span>
                      <span className='font-bold text-lg text-primary'>
                        {formatCurrency(form.getValues('totalAmount'))}
                      </span>
                    </div>
                  </div>
            
                  <div className='max-h-[1000px] overflow-y-auto border rounded-md bg-background'>
                    <Table>
                      <TableHeader>
                        <TableRow className='h-8 bg-muted/50'>
                          <TableHead className='w-[40px] px-2 text-center'>
                            <Checkbox
                              className='cursor-pointer'
                              checked={
                                allInvoices.length > 0 &&
                                allInvoices.every((inv) =>
                                  selectedInvoiceIds.includes(inv._id),
                                )
                              }
                              onCheckedChange={(checked) =>
                                handleSelectAll(!!checked)
                              }
                            />
                          </TableHead>
                          <TableHead className='py-1'>Factură</TableHead>
                        
                          <TableHead className='py-1'>Data Fact.</TableHead>
                  
                          <TableHead className='py-1'>Scadență</TableHead>
                          <TableHead className='text-right py-1'>
                            Rest Plată
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allInvoices.map((inv) => {
                          const isNegative = inv.remainingAmount < 0
                          const isSelected = selectedInvoiceIds.includes(
                            inv._id,
                          )
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const dueDate = new Date(inv.dueDate)
                          const isOverdue = dueDate < today && !isNegative
                          return (
                            <TableRow
                              key={inv._id}
                              className={cn(
                                'h-8 text-sm',
                                isSelected && 'bg-muted/60',
                              )}
                            >
                              <TableCell className='px-2 text-center'>
                                <Checkbox
                                  className='cursor-pointer'
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    handleToggleInvoice(inv._id)
                                  }
                                />
                              </TableCell>
                              <TableCell className='py-1 font-medium'>
                                {inv.invoiceSeries
                                  ? `${inv.invoiceSeries} - `
                                  : ''}
                                {inv.invoiceNumber}
                              </TableCell>

                          
                              <TableCell className='py-1 text-muted-foreground'>
                                {
                                  formatDateTime(new Date(inv.invoiceDate))
                                    .dateOnly
                                }
                              </TableCell>
                         

                              <TableCell
                                className={cn(
                                  'py-1',
                                  isOverdue
                                    ? 'text-red-600 font-bold'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {formatDateTime(dueDate).dateOnly}
                              </TableCell>

                              <TableCell
                                className={cn(
                                  'text-right py-1 font-semibold',
                                  isNegative ? 'text-red-600' : '',
                                )}
                              >
                                {formatCurrency(inv.remainingAmount)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center py-6 text-muted-foreground text-sm'>
                  {!loadingInvoices ? (
                    <>
                      <AlertCircle className='h-8 w-8 mb-2 opacity-20' />
                      <p>Nu există facturi neplătite.</p>
                    </>
                  ) : (
                    <p>Se încarcă facturile...</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  )
}
