'use client'

import { useRouter } from 'next/navigation'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'
import { useMemo, useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'
import {
  PopulatedReception,
  ReceptionCreateInput,
} from '@/lib/db/modules/reception/types'
import { INVENTORY_LOCATIONS } from '@/lib/db/modules/inventory/constants'
import { ReceptionItemRow } from './reception-item-row'
import { AutocompleteSearch } from './autocomplete-search'
import { toast } from 'sonner'
import { distributeTransportCost } from '@/lib/db/modules/reception/reception.helpers'
import { ReceptionDeliveries } from './reception-deliveries'
import { ReceptionInvoices } from './reception-invoices'

type Project = { _id: string; name: string }

const locationDisplayMap = {
  DEPOZIT: 'Depozit (marfa intră fizic la noi)',
  IN_TRANZIT: 'În Tranzit (a plecat de la furnizor)',
  LIVRARE_DIRECTA: 'Livrare Directă (la client/șantier)',
  CUSTODIE_FURNIZOR: 'Custodie la Furnizor (plătită, dar nelivrată)',
  CUSTODIE_GNS: 'Custodie la GNS (livrată, dar neplătită)',
  CUSTODIE_PENTRU_CLIENT:
    'Custodie pentru Client (plătită de client, nelivrată)',
}

const PROJECT_OPTION_VALUE = 'PROIECT'

type ReceptionFormProps = {
  initialData?: PopulatedReception
  currentUserId: string
}

export function ReceptionForm({
  initialData,
  currentUserId,
}: ReceptionFormProps) {
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projects] = useState<Project[]>([
    { _id: 'proj1', name: 'Proiect Rezidențial Central' },
    { _id: 'proj2', name: 'Renovare Birouri Corporative' },
  ])

  const isEditMode = !!initialData

  const form = useForm<ReceptionCreateInput>({
    defaultValues: initialData
      ? {
          createdBy: initialData.createdBy._id,
          supplier: initialData.supplier?._id || '',
          receptionDate: new Date(initialData.receptionDate),
          destinationLocation: initialData.destinationLocation,
          destinationType: initialData.destinationType,
          destinationId: initialData.destinationId,
          products:
            initialData.products?.map((p) => ({
              product: p.product._id,
              quantity: p.quantity,
              unitMeasure: p.unitMeasure,
              invoicePricePerUnit: p.invoicePricePerUnit,
            })) || [],
          packagingItems:
            initialData.packagingItems?.map((p) => ({
              packaging: p.packaging._id,
              quantity: p.quantity,
              unitMeasure: p.unitMeasure,
              invoicePricePerUnit: p.invoicePricePerUnit,
            })) || [],
          deliveries:
            initialData.deliveries?.map((d) => ({
              ...d,
              dispatchNoteDate: new Date(d.dispatchNoteDate),
            })) || [],
          invoices:
            initialData.invoices?.map((i) => ({
              ...i,
              date: new Date(i.date),
            })) || [],
        }
      : // Mod de creare:
        {
          createdBy: currentUserId,
          supplier: '',
          receptionDate: new Date(),
          destinationLocation: 'DEPOZIT',
          destinationType: 'DEPOZIT',
          products: [],
          packagingItems: [],
          deliveries: [],
          invoices: [],
        },
  })

  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
  } = useFieldArray({
    control: form.control,
    name: 'products',
  })
  const {
    fields: packagingFields,
    append: appendPackaging,
    remove: removePackaging,
  } = useFieldArray({
    control: form.control,
    name: 'packagingItems',
  })

  // ---  LOGICĂ DE CALCUL ---
  const watchedProducts = form.watch('products')
  const watchedPackagingItems = form.watch('packagingItems')
  const watchedInvoices = form.watch('invoices')
  const watchedDeliveries = form.watch('deliveries')
  const productsDependency = JSON.stringify(watchedProducts)
  const packagingDependency = JSON.stringify(watchedPackagingItems)
  const invoicesDependency = JSON.stringify(watchedInvoices)
  const deliveriesDependency = JSON.stringify(watchedDeliveries)

  const {
    summaryTotals,
    invoicesTotal,
    transportTotal,
    grandLandedTotal,
    costsMap,
  } = useMemo(() => {
    const localInvoicesTotal = (watchedInvoices || []).reduce(
      (sum, invoice) => sum + (invoice.amount || 0),
      0
    )

    const productsTotal = (watchedProducts || []).reduce((sum, item) => {
      const price = item.invoicePricePerUnit ?? 0
      const quantity = item.quantity ?? 0
      return sum + price * quantity
    }, 0)

    const packagingTotal = (watchedPackagingItems || []).reduce((sum, item) => {
      const price = item.invoicePricePerUnit ?? 0
      const quantity = item.quantity ?? 0
      return sum + price * quantity
    }, 0)

    const localSummaryTotals = {
      productsTotal,
      packagingTotal,
      grandTotal: productsTotal + packagingTotal,
    }

    const localTransportTotal = (watchedDeliveries || []).reduce(
      (sum, delivery) => {
        return sum + (delivery.transportCost || 0)
      },
      0
    )

    const allItems = [
      ...(watchedProducts || []).map((p, i) => ({
        ...p,
        originalIndex: i,
        type: 'product',
      })),
      ...(watchedPackagingItems || []).map((p, i) => ({
        ...p,
        originalIndex: i,
        type: 'packaging',
      })),
    ]
    const itemsWithCosts = distributeTransportCost(
      allItems,
      localTransportTotal
    )

    const localCostsMap = new Map<string, number>()
    itemsWithCosts.forEach((item) => {
      localCostsMap.set(
        `${item.type}_${item.originalIndex}`,
        item.totalDistributedTransportCost
      )
    })

    return {
      invoicesTotal: localInvoicesTotal,
      summaryTotals: localSummaryTotals,
      transportTotal: localTransportTotal,
      grandLandedTotal: localSummaryTotals.grandTotal + localTransportTotal,
      costsMap: localCostsMap,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    productsDependency,
    packagingDependency,
    invoicesDependency,
    deliveriesDependency,
  ])

  // Urmărim valoarea din selectorul de destinație
  const destinationLocation = form.watch('destinationLocation')

  async function onSubmit(values: ReceptionCreateInput, isFinal: boolean) {
    setIsSubmitting(true)

    if (isFinal) {
      // Comparam totalul facturilor cu totalul de pe factură al articolelor
      const itemsInvoiceTotal = grandLandedTotal

      if (invoicesTotal.toFixed(2) !== itemsInvoiceTotal.toFixed(2)) {
        toast.error('Verificare eșuată', {
          description: `Suma totală a facturilor (${formatCurrency(
            invoicesTotal
          )}) nu corespunde cu valoarea de factură a articolelor (${formatCurrency(
            itemsInvoiceTotal
          )}). Vă rugăm corectați.`,
          duration: 8000,
        })
        setIsSubmitting(false)
        return
      }
    }

    // Construim payload-ul și URL-ul corect
    const payload = { ...values, isFinal }
    const url = isEditMode
      ? `/api/admin/management/receptions/${initialData?._id}`
      : '/api/admin/management/receptions'
    const method = isEditMode ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'A apărut o eroare')
      }

      toast.success('Recepție finalizată cu succes!')

      router.push('/admin/management/reception')
      router.refresh()
    } catch (error) {
      console.error('Eroare la trimiterea formularului:', error)
      toast.error('Eroare la Salvare', {
        description:
          'Completeaza toate datele necesare pentru salvarea recepției.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => onSubmit(data, true))}
          className='space-y-6'
        >
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Detalii Generale */}
            <Card className='md:col-span-1'>
              <CardHeader>
                <CardTitle>Detalii Generale Recepție</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <FormField
                    name='supplier'
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className='flex flex-col'>
                        <FormLabel>
                          Furnizor
                          <span>
                            * <span className='text-red-500'>*</span>
                          </span>
                        </FormLabel>
                        <AutocompleteSearch
                          searchType='supplier'
                          value={field.value}
                          initialSelectedItem={initialData?.supplier}
                          onChange={(id) => {
                            form.setValue('supplier', id, {
                              shouldValidate: true,
                            })
                          }}
                          placeholder='Caută furnizor...'
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name='receptionDate'
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className='flex flex-col'>
                        <FormLabel>
                          Data Recepției{' '}
                          <span>
                            * <span className='text-red-500'>*</span>
                          </span>
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant='outline'
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: ro })
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
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- SECȚIUNEA PENTRU DESTINAȚIE --- */}
                <div className='grid grid-cols-1 gap-4'>
                  <FormField
                    name='destinationLocation'
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Destinația Stocului{' '}
                          <span>
                            * <span className='text-red-500'>*</span>
                          </span>
                        </FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            if (value === PROJECT_OPTION_VALUE) {
                              form.setValue('destinationType', 'PROIECT')
                            } else {
                              form.setValue('destinationType', 'DEPOZIT')
                              form.setValue('destinationId', undefined)
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className='w-full cursor-pointer'>
                              <SelectValue placeholder='Selectează o destinație...' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Locații Generale</SelectLabel>
                              {INVENTORY_LOCATIONS.map((loc) => (
                                <SelectItem
                                  key={loc}
                                  value={loc}
                                  className='cursor-pointer'
                                >
                                  {locationDisplayMap[loc]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectGroup>
                              <SelectLabel>Proiecte</SelectLabel>
                              <SelectItem
                                value={PROJECT_OPTION_VALUE}
                                className='cursor-pointer'
                              >
                                Proiect Dedicat
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Selectorul de proiecte, afișat condiționat */}
                  {destinationLocation === PROJECT_OPTION_VALUE && (
                    <FormField
                      name='destinationId'
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selectează Proiectul *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value ?? ''}
                          >
                            <FormControl>
                              <SelectTrigger className='w-full cursor-pointer'>
                                <SelectValue placeholder='Alege un proiect...' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects.map((proj) => (
                                <SelectItem
                                  key={proj._id}
                                  value={proj._id}
                                  className='cursor-pointer'
                                >
                                  {proj.name}
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
              </CardContent>
            </Card>
            {/* Livrări Fizice (Aviz, Șofer, Mașină) */}
            <div className='md:col-span-2'>
              <ReceptionDeliveries />
            </div>
          </div>
          {/* CARD 2: Pentru Facturi */}
          <ReceptionInvoices />
          {/* CARD 3: Pentru Recepții */}
          <Card>
            <CardHeader>
              <CardTitle className='flex justify-between items-center'>
                <span>Articole Recepționate</span>
                <div className='text-sm font-normal text-muted-foreground space-x-4 flex items-center'>
                  <span>
                    Valoare Marfă:{' '}
                    <strong className='text-foreground'>
                      {formatCurrency(summaryTotals.grandTotal)}
                    </strong>
                  </span>
                  <span>
                    Cost Transport:{' '}
                    <strong className='text-foreground'>
                      {formatCurrency(transportTotal)}
                    </strong>
                  </span>
                  <span
                    className={cn(
                      'text-base font-semibold border-l pl-4 ml-2 p-2 rounded-lg transition-colors',
                      // Aplicăm clasele condiționat
                      invoicesTotal.toFixed(2) === grandLandedTotal.toFixed(2)
                        ? 'bg-lime-950/80'
                        : 'bg-red-950/80'
                    )}
                  >
                    TOTAL Intrare:{' '}
                    <strong
                      className={cn(
                        invoicesTotal.toFixed(2) === grandLandedTotal.toFixed(2)
                          ? 'text-green-400'
                          : 'text-red-400'
                      )}
                    >
                      {formatCurrency(grandLandedTotal)}
                    </strong>
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <h4 className='text-lg font-medium mb-2'>Produse</h4>
                {productFields.map((field, index) => {
                  const initialProductData =
                    initialData?.products?.[index]?.product
                  return (
                    <ReceptionItemRow
                      key={field.id}
                      form={form}
                      itemType='products'
                      index={index}
                      onRemove={() => removeProduct(index)}
                      initialItemData={initialProductData}
                      distributedTransportCost={
                        costsMap.get(`product_${index}`) || 0
                      }
                    />
                  )
                })}
                <Button
                  className='mt-2'
                  type='button'
                  variant='outline'
                  onClick={() =>
                    appendProduct({
                      product: '',
                      quantity: 1,
                      unitMeasure: 'bucata',
                      invoicePricePerUnit: null,
                    })
                  }
                >
                  Adaugă Produs
                </Button>
              </div>
              <div>
                <h4 className='text-lg font-medium mb-2'>Ambalaje</h4>
                {packagingFields.map((field, index) => {
                  const initialPackagingData =
                    initialData?.packagingItems?.[index]?.packaging
                  return (
                    <ReceptionItemRow
                      key={field.id}
                      form={form}
                      itemType='packagingItems'
                      index={index}
                      onRemove={() => removePackaging(index)}
                      initialItemData={initialPackagingData}
                      distributedTransportCost={
                        costsMap.get(`packaging_${index}`) || 0
                      }
                    />
                  )
                })}
                <Button
                  className='mt-2'
                  type='button'
                  variant='outline'
                  onClick={() =>
                    appendPackaging({
                      packaging: '',
                      quantity: 1,
                      unitMeasure: 'bucata',
                      invoicePricePerUnit: null,
                    })
                  }
                >
                  Adaugă Ambalaj
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className='flex justify-end gap-4'>
            <Button
              type='button'
              variant='outline'
              disabled={isSubmitting}
              onClick={() =>
                form.handleSubmit((data) => onSubmit(data, false))()
              }
            >
              {isSubmitting ? 'Se salvează...' : 'Salvează Ciornă'}
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Se finalizează...' : 'Salvează și Finalizează'}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}
