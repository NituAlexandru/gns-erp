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
import { cn, formatCurrency, round2 } from '@/lib/utils'
import {
  PopulatedReception,
  ReceptionCreateInput,
} from '@/lib/db/modules/reception/types'
import { INVENTORY_LOCATIONS } from '@/lib/db/modules/inventory/constants'
import { ReceptionItemRow } from './reception-item-row'
import { AutocompleteSearch, SearchResult } from './autocomplete-search'
import { toast } from 'sonner'
import { distributeTransportCost } from '@/lib/db/modules/reception/reception.helpers'
import { ReceptionDeliveries } from './reception-deliveries'
import { ReceptionInvoices } from './reception-invoices'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'

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
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
}

export function ReceptionForm({
  initialData,
  currentUserId,
  vatRates,
  defaultVatRate,
}: ReceptionFormProps) {
  const router = useRouter()
  const [selectedSupplier, setSelectedSupplier] = useState<SearchResult | null>(
    initialData?.supplier ? { ...initialData.supplier, isVatPayer: true } : null
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projects] = useState<Project[]>([
    { _id: 'proj1', name: 'Proiect Rezidențial Central' },
    { _id: 'proj2', name: 'Renovare Birouri Corporative' },
  ])

  const isEditMode = !!initialData
  const defaultVat = defaultVatRate?.rate ?? 0

  const form = useForm<ReceptionCreateInput>({
    defaultValues: initialData
      ? {
          createdBy: initialData.createdBy._id,
          supplier: initialData.supplier?._id || '',
          orderRef: initialData.orderRef?.toString(),
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
              vatRate: p.vatRate,
              qualityDetails: p.qualityDetails || {
                lotNumbers: [],
                certificateNumbers: [],
                testReports: [],
                additionalNotes: '',
              },
            })) || [],
          packagingItems:
            initialData.packagingItems?.map((p) => ({
              packaging: p.packaging._id,
              quantity: p.quantity,
              unitMeasure: p.unitMeasure,
              invoicePricePerUnit: p.invoicePricePerUnit,
              vatRate: p.vatRate,
              qualityDetails: p.qualityDetails || {
                lotNumbers: [],
                certificateNumbers: [],
                testReports: [],
                additionalNotes: '',
              },
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
              dueDate: i.dueDate ? new Date(i.dueDate) : undefined,
            })) || [],
        }
      : // Mod de creare:
        {
          createdBy: currentUserId,
          supplier: '',
          orderRef: undefined,
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

  const watchedValues = JSON.stringify(form.watch())

  const {
    summaryTotals,
    transportTotal,
    grandLandedTotal,
    costsMap,
    invoicesVatTotal,
    invoicesGrandTotal,
    isBalancedNoVat,
  } = useMemo(() => {
    const watchedData = form.getValues()

    // 1) total marfă (fără TVA)
    const productsTotal = (watchedData.products || []).reduce(
      (sum, item) =>
        sum + (item.invoicePricePerUnit ?? 0) * (item.quantity ?? 0),
      0
    )
    const packagingTotal = (watchedData.packagingItems || []).reduce(
      (sum, item) =>
        sum + (item.invoicePricePerUnit ?? 0) * (item.quantity ?? 0),
      0
    )
    const merchandiseTotal = productsTotal + packagingTotal
    const localSummaryTotals = {
      productsTotal,
      packagingTotal,
      grandTotal: merchandiseTotal,
    }

    // 2) transport
    const localTransportTotal = (watchedData.deliveries || []).reduce(
      (sum, d) => sum + Number(d.transportCost || 0),
      0
    )

    // 3) facturi în UI (fără conversii)
    const localInvoicesTotal = (watchedData.invoices || []).reduce(
      (sum, inv) => sum + (inv.amount || 0),
      0
    )
    const localInvoicesVatTotal = (watchedData.invoices || []).reduce(
      (sum, inv) => sum + (inv.amount || 0) * ((inv.vatRate || 0) / 100),
      0
    )
    const localInvoicesGrandTotal = localInvoicesTotal + localInvoicesVatTotal

    // 4) Σ facturi fără TVA convertit în RON pentru verificare (include curs)
    const invoicesNoVatRON = (watchedData.invoices || []).reduce((sum, inv) => {
      const amt = inv.amount ?? 0
      const fx =
        inv.currency === 'RON'
          ? 1
          : inv.exchangeRateOnIssueDate && inv.exchangeRateOnIssueDate > 0
            ? inv.exchangeRateOnIssueDate
            : 0
      return sum + amt * fx
    }, 0)

    // 5) comparație corectă: (marfă + transport) vs Σ facturi fără TVA
    const expectedNoVatRON = merchandiseTotal + localTransportTotal
    const isBalanced =
      Math.round((invoicesNoVatRON + Number.EPSILON) * 100) ===
      Math.round((expectedNoVatRON + Number.EPSILON) * 100)
    // 6) distribuția transportului

    // Pas 1: Pregătim listele separat, adăugând metadatele necesare

    const productsToProcess = (watchedData.products || []).map((p, i) => ({
      ...p,
      originalIndex: i,
      type: 'product' as const,
    }))
    const packagingsToProcess = (watchedData.packagingItems || []).map(
      (p, i) => ({
        ...p,
        originalIndex: i,
        type: 'packaging' as const,
      })
    ) // Pas 2: Distribuim costul DOAR pe produse.

    const productsWithCosts = distributeTransportCost(
      productsToProcess,
      localTransportTotal
    ) // Pas 3: Creăm lista de ambalaje cu cost zero, păstrând structura.

    const packagingsWithZeroCost = packagingsToProcess.map((p) => ({
      ...p,
      totalDistributedTransportCost: 0,
    })) // Pas 4: Recombinăm listele. `itemsWithCosts` va avea aceeași structură ca înainte.

    const itemsWithCosts = [...productsWithCosts, ...packagingsWithZeroCost]

    const localCostsMap = new Map<string, number>()
    itemsWithCosts.forEach((item) => {
      localCostsMap.set(
        `${item.type}_${item.originalIndex}`,
        item.totalDistributedTransportCost
      )
    })

    return {
      summaryTotals: localSummaryTotals,
      transportTotal: localTransportTotal,
      grandLandedTotal: merchandiseTotal + localTransportTotal,
      costsMap: localCostsMap,
      invoicesTotal: localInvoicesTotal,
      invoicesVatTotal: localInvoicesVatTotal,
      invoicesGrandTotal: localInvoicesGrandTotal, // TOTAL General (cu TVA)
      invoicesTotalNoVatRON: invoicesNoVatRON,
      isBalancedNoVat: isBalanced,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues])

  // Urmărim valoarea din selectorul de destinație
  const destinationLocation = form.watch('destinationLocation')

  async function onSubmit(values: ReceptionCreateInput, isFinal: boolean) {
    setIsSubmitting(true)

    if (isFinal) {
      // 1) Citim ce e în formular ACUM
      const dataNow = form.getValues()

      // 2) Suma facturilor FĂRĂ TVA, în RON (dacă valuta ≠ RON, folosim exchangeRateOnIssueDate)
      const invoicesTotalNoVatRON = round2(
        (dataNow.invoices || []).reduce((sum, inv) => {
          const amount = typeof inv.amount === 'number' ? inv.amount : 0
          // Folosim "extras" ca să evităm any:
          const extras = inv as unknown as {
            currency?: string
            exchangeRateOnIssueDate?: number
            series?: string
            number?: string
          }
          const currency = extras.currency ?? 'RON'
          const fx = extras.exchangeRateOnIssueDate

          if (currency !== 'RON') {
            if (!fx || fx <= 0) {
              // mesaj clar când lipsește cursul
              throw new Error(
                `Factura ${extras.series || ''} ${extras.number || ''}: lipsește exchangeRateOnIssueDate pentru ${currency}.`
              )
            }
            return sum + amount * fx
          }

          return sum + amount
        }, 0)
      )

      // 3) Valoarea mărfii FĂRĂ TVA (produse + ambalaje) + transport (TOT în RON)
      const expectedNoVatRON = round2(summaryTotals.grandTotal + transportTotal)

      // 4) Comparație strictă (după rotunjire)
      if (invoicesTotalNoVatRON !== expectedNoVatRON) {
        toast.error('Verificare eșuată', {
          description: `Suma facturilor fără TVA (${formatCurrency(
            invoicesTotalNoVatRON
          )}) trebuie să fie egală cu (valoarea mărfii + transport) (${formatCurrency(
            expectedNoVatRON
          )}).`,
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
                  {/* Furnizor */}
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
                          onChange={(id, item) => {
                            form.setValue('supplier', id, {
                              shouldValidate: true,
                            })

                            setSelectedSupplier(item)
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
                            * <span className='text-red-600'>*</span>
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
                  <FormField
                    name='orderRef'
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comandă Furnizor (Opțional)</FormLabel>
                        <FormControl>
                          {/* Momentan un input simplu text NU va merge cu backend-ul (cere ObjectId).
                              Aici ar trebui sa fie AutocompleteSearch type='supplier-order'.
                              Daca nu ai implementat cautarea de comenzi, lasa-l disabled sau ascuns.
                          */}
                          <div className='text-sm text-muted-foreground border rounded-md p-2 bg-muted/20'>
                            Selecție comandă (neimplementat UI încă)
                          </div>
                          {/* <AutocompleteSearch 
                              searchType="supplierOrder" 
                              value={field.value} 
                              onChange={(id) => field.onChange(id)} 
                           /> 
                          */}
                        </FormControl>
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
          <ReceptionInvoices
            vatRates={vatRates}
            defaultVatRate={defaultVatRate}
            isVatPayer={selectedSupplier?.isVatPayer ?? false}
          />
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
                  {selectedSupplier?.isVatPayer && (
                    <span>
                      TVA Facturi:{' '}
                      <strong className='text-foreground'>
                        {formatCurrency(invoicesVatTotal)}
                      </strong>
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-base font-semibold border pl-4 ml-2 p-2 rounded-lg',
                      isBalancedNoVat
                        ? 'border-emerald-600/40 text-emerald-400 bg-emerald-600/10'
                        : 'border-red-600/40 text-red-400 bg-red-600/10'
                    )}
                    title={
                      isBalancedNoVat
                        ? 'Σ facturi fără TVA = marfă + transport'
                        : 'Diferență între Σ facturi fără TVA și (marfă + transport)'
                    }
                  >
                    TOTAL Intrare:{' '}
                    <strong className='ml-1'>
                      {formatCurrency(grandLandedTotal)}
                    </strong>
                  </span>

                  {selectedSupplier?.isVatPayer && (
                    <span
                      className={cn(
                        'text-base font-semibold border pl-4 ml-2 p-2 rounded-lg', // Am pus 'border' complet pentru consistență vizuală
                        isBalancedNoVat
                          ? 'border-emerald-600/40 text-emerald-400 bg-emerald-600/10'
                          : 'border-red-600/40 text-red-400 bg-red-600/10'
                      )}
                      title={
                        isBalancedNoVat
                          ? 'Balanța este corectă: Σ facturi fără TVA = marfă + transport'
                          : 'Atenție: Σ facturi fără TVA este diferită de marfă + transport'
                      }
                    >
                      TOTAL General:{' '}
                      <strong>{formatCurrency(invoicesGrandTotal)}</strong>
                    </span>
                  )}
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
                      vatRates={vatRates}
                      isVatPayer={selectedSupplier?.isVatPayer ?? false}
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
                      vatRate: defaultVat,
                      qualityDetails: {
                        lotNumbers: [],
                        certificateNumbers: [],
                        testReports: [],
                        additionalNotes: '',
                      },
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
                      vatRates={vatRates}
                      isVatPayer={selectedSupplier?.isVatPayer ?? false}
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
                      vatRate: defaultVat,
                      qualityDetails: {
                        lotNumbers: [],
                        certificateNumbers: [],
                        testReports: [],
                        additionalNotes: '',
                      },
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
