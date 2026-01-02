'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  createReceiptAction,
  getReceiptSeriesList,
} from '@/lib/db/modules/financial/receipts/receipt.actions'
import { numberToWordsRo } from '@/lib/db/modules/financial/receipts/receipt.utils'
import {
  CreateReceiptSchema,
  CreateReceiptInput,
} from '@/lib/db/modules/financial/receipts/receipt.validator'
import { ReceiptAllocationItem } from '@/lib/db/modules/financial/receipts/receipt.types'
import { ClientSelector } from '@/app/(root)/orders/components/ClientSelector'
import { InvoicePaymentSelector } from './InvoicePaymentSelector'
import { Textarea } from '@/components/ui/textarea'

export function CreateReceiptForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // 1. STATE NOU: Păstrăm tot obiectul clientului aici pentru a mulțumi TypeScript-ul
  // Folosim 'any' temporar ca să nu mai avem erori de tip importate din alte module
  const [selectedClientData, setSelectedClientData] = useState<any>(null)
  const [availableSeries, setAvailableSeries] = useState<string[]>([])
  const [showSeriesSelect, setShowSeriesSelect] = useState(false)

  const form = useForm<CreateReceiptInput>({
    resolver: zodResolver(CreateReceiptSchema),
    defaultValues: {
      clientId: '',
      clientName: '',
      clientCui: '',
      clientAddress: {
        judet: '',
        localitate: '',
        strada: '',
        numar: '',
        codPostal: '',
        alteDetalii: '',
        tara: 'RO',
      },
      amount: 0,
      representative: '',
      explanation: 'Contravaloare facturi',
      seriesName: '',
      allocations: [],
      invoices: [],
    },
  })

  // Urmărim ID-ul clientului pentru a afișa tabelul de facturi
  const selectedClientId = useWatch({
    control: form.control,
    name: 'clientId',
  })

  const watchedAmount = useWatch({
    control: form.control,
    name: 'amount',
  })

  const amountInWordsPreview =
    watchedAmount > 0 ? numberToWordsRo(watchedAmount) : ''

  // Handler tabel facturi
  const handleInvoiceSelection = (
    totalAmount: number,
    allocations: ReceiptAllocationItem[]
  ) => {
    form.setValue('amount', totalAmount)
    form.setValue('allocations', allocations)

    if (allocations.length > 0) {
      const invoiceNumbers = allocations
        .map((a) => `${a.invoiceSeries} ${a.invoiceNumber}`)
        .join(', ')
      form.setValue('explanation', `Contravaloare facturi: ${invoiceNumbers}`)
    } else {
      form.setValue('explanation', 'Contravaloare facturi')
    }
  }

  // Handler selecție client
  const onClientSelect = (client: any) => {
    setSelectedClientData(client)

    if (client) {
      form.setValue('clientId', client._id)
      form.setValue('clientName', client.name)
      form.setValue('clientCui', client.vatId || client.cnp || '')

      if (client.address) {
        form.setValue('clientAddress', {
          judet: client.address.judet || '',
          localitate: client.address.localitate || '',
          strada: client.address.strada || '',
          numar: client.address.numar || '',
          codPostal: client.address.codPostal || '',
          alteDetalii: client.address.alteDetalii || '',
          tara: 'RO',
        })
      }
      form.setValue('allocations', [])
      form.setValue('amount', 0)
    } else {
      form.setValue('clientId', '')
      form.setValue('clientName', '')
    }
  }

  const onSubmit = (values: CreateReceiptInput) => {
    startTransition(async () => {
      const result = await createReceiptAction(values)

      if (result.success) {
        toast.success('Chitanța a fost emisă cu succes!')
        form.reset()
        // Resetăm și state-ul local
        setSelectedClientData(null)
        router.push('/financial/receipts')
      } else if (result.requireSelection && result.series) {
        setAvailableSeries(result.series)
        setShowSeriesSelect(true)
        toast.info(result.message)
      } else {
        toast.error(result.message || 'Eroare la emitere.')
      }
    })
  }

  useEffect(() => {
    const fetchSeries = async () => {
      const res = await getReceiptSeriesList()
      if (res.success && res.data.length > 0) {
        setAvailableSeries(res.data)

        // Dacă e mai mult de una, arată selectorul
        if (res.data.length > 1) {
          setShowSeriesSelect(true)
        }
        // Dacă e doar una, o selectăm automat și nu arătăm selectorul
        else if (res.data.length === 1) {
          form.setValue('seriesName', res.data[0])
        }
      }
    }
    fetchSeries()
  }, [form])

  return (
    <Card className='w-full shadow-md'>
      <CardHeader>
        <CardTitle className='text-xl flex items-center gap-2'>
          <Plus className='h-5 w-5 text-primary' />
          Emitere Chitanță Nouă
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            {showSeriesSelect && (
              <FormField
                control={form.control}
                name='seriesName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alege Seria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Selectează seria chitanței' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSeries.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className=''>
              <div className='flex gap-4 flex-row'>
                <ClientSelector
                  onClientSelect={onClientSelect}
                  selectedClient={selectedClientData}
                />
                {form.formState.errors.clientId && (
                  <p className='text-sm font-medium text-destructive'>
                    {form.formState.errors.clientId.message}
                  </p>
                )}{' '}
                {selectedClientId && (
                  <InvoicePaymentSelector
                    clientId={selectedClientId}
                    onSelectionChange={handleInvoiceSelection}
                  />
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='amount'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suma Încasată (RON)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        step='0.01'
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                        className='font-bold text-lg'
                      />
                    </FormControl>
                    <FormDescription className='italic text-primary'>
                      {amountInWordsPreview
                        ? `"${amountInWordsPreview}"`
                        : 'Introduceți suma...'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='explanation'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='pb-[-4px]'>
                      Ce reprezintă suma?
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder='Ex: Cval. Facturi...' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='representative'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primit de la (Nume Depunător)</FormLabel>
                  <FormControl>
                    <Input placeholder='Ex: Popescu Ion' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type='submit'
              className='w-full'
              size='lg'
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Se emite...
                </>
              ) : (
                'Emite Chitanța'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
