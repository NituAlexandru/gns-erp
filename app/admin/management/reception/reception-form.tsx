'use client'

import { useRouter } from 'next/navigation'
import { FormProvider, useFieldArray, useForm } from 'react-hook-form'
import { useMemo, useState } from 'react'
import {
  CalendarIcon,
  Info,
  MapPin,
  Package,
  PlusCircle,
  ShoppingCart,
  Truck,
} from 'lucide-react'
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
import { ISupplierOrderDoc } from '@/lib/db/modules/supplier-orders/supplier-order.types'
import {
  getOpenOrdersBySupplier,
  getOrderDetailsForReception,
} from '@/lib/db/modules/supplier-orders/supplier-order.actions'

export const locationDisplayMap = {
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
  const isEditMode = !!initialData
  const defaultVat = defaultVatRate?.rate ?? 0
  const [openOrders, setOpenOrders] = useState<ISupplierOrderDoc[]>([])
  const [selectedOrderData, setSelectedOrderData] =
    useState<ISupplierOrderDoc | null>(null)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

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
    calculatedVatTotal,
    calculatedGrandTotal,
    isBalancedNoVat,
    isBalancedWithVat, // <--- Variabila noua pe care o returnam
  } = useMemo(() => {
    const watchedData = form.getValues()

    // 1) Calculăm Marfa (Net și TVA)
    const productsReduce = (watchedData.products || []).reduce(
      (acc, item) => {
        const net = (item.invoicePricePerUnit ?? 0) * (item.quantity ?? 0)
        const vat = net * ((item.vatRate ?? 0) / 100)
        return { net: acc.net + net, vat: acc.vat + vat }
      },
      { net: 0, vat: 0 }
    )

    const packagingReduce = (watchedData.packagingItems || []).reduce(
      (acc, item) => {
        const net = (item.invoicePricePerUnit ?? 0) * (item.quantity ?? 0)
        const vat = net * ((item.vatRate ?? 0) / 100)
        return { net: acc.net + net, vat: acc.vat + vat }
      },
      { net: 0, vat: 0 }
    )

    const merchandiseNet = productsReduce.net + packagingReduce.net
    const merchandiseVat = productsReduce.vat + packagingReduce.vat

    // 2) Calculăm Transportul (Net și TVA)
    const transportReduce = (watchedData.deliveries || []).reduce(
      (acc, delivery) => {
        const cost = Number(delivery.transportCost || 0)
        const rate = Number(delivery.transportVatRate || 0)
        const vat = cost * (rate / 100)
        return {
          cost: acc.cost + cost,
          vat: acc.vat + vat,
        }
      },
      { cost: 0, vat: 0 }
    )

    const transportNet = transportReduce.cost
    const transportVat = transportReduce.vat

    // --- TOTALURILE PENTRU CARDUL DE JOS (Ce a intrat in stoc) ---
    const totalIntrareNet = merchandiseNet + transportNet
    const totalTvaCalculated = merchandiseVat + transportVat
    const totalGeneralCalculated = totalIntrareNet + totalTvaCalculated

    // 3) Calculăm Facturile pentru VALIDARE

    // A. Calculăm NET-ul facturilor în RON
    const calculatedInvoicesNoVatRON = (watchedData.invoices || []).reduce(
      (sum, invoice) => {
        const amount = invoice.amount ?? 0

        // Determinam cursul valutar (exchangeRate)
        const exchangeRate =
          invoice.currency === 'RON'
            ? 1
            : invoice.exchangeRateOnIssueDate &&
                invoice.exchangeRateOnIssueDate > 0
              ? invoice.exchangeRateOnIssueDate
              : 0

        return sum + amount * exchangeRate
      },
      0
    )

    // B. Calculăm BRUT-ul facturilor în RON (Net + TVA)
    const calculatedInvoicesGrossRON = (watchedData.invoices || []).reduce(
      (sum, invoice) => {
        const amount = invoice.amount ?? 0
        const vatRate = invoice.vatRate ?? 0

        // Calculam valoarea TVA-ului
        const vatValue = amount * (vatRate / 100)

        // Valoarea totala a facturii (Brut)
        const grossAmount = amount + vatValue

        // Determinam cursul valutar (exchangeRate)
        const exchangeRate =
          invoice.currency === 'RON'
            ? 1
            : invoice.exchangeRateOnIssueDate &&
                invoice.exchangeRateOnIssueDate > 0
              ? invoice.exchangeRateOnIssueDate
              : 0

        return sum + grossAmount * exchangeRate
      },
      0
    )

    // Validare 1: Net Facturi vs Total Intrare Net (Strict la 2 zecimale)
    const isBalancedNoVat =
      Math.round((calculatedInvoicesNoVatRON + Number.EPSILON) * 100) ===
      Math.round((totalIntrareNet + Number.EPSILON) * 100)

    // Validare 2: Brut Facturi vs Total General Brut (Strict la 2 zecimale)
    const isBalancedWithVat =
      Math.round((calculatedInvoicesGrossRON + Number.EPSILON) * 100) ===
      Math.round((totalGeneralCalculated + Number.EPSILON) * 100)

    // --- Distribuire cost transport (Logica existenta) ---
    const productsToProcess = (watchedData.products || []).map((p, i) => ({
      ...p,
      originalIndex: i,
      type: 'product',
    }))
    const packagingsToProcess = (watchedData.packagingItems || []).map(
      (p, i) => ({
        ...p,
        originalIndex: i,
        type: 'packaging',
      })
    )
    // Folosim orice in loc de o interfata stricta aici pentru a evita erorile de typescript pe moment
    const productsWithCosts = distributeTransportCost(
      productsToProcess as any,
      transportNet
    )
    const packagingsWithZeroCost = packagingsToProcess.map((p) => ({
      ...p,
      totalDistributedTransportCost: 0,
    }))

    const itemsWithCosts = [...productsWithCosts, ...packagingsWithZeroCost]
    const localCostsMap = new Map<string, number>()

    itemsWithCosts.forEach((item: any) => {
      localCostsMap.set(
        `${item.type}_${item.originalIndex}`,
        item.totalDistributedTransportCost
      )
    })

    return {
      summaryTotals: { grandTotal: merchandiseNet },
      transportTotal: transportNet,
      grandLandedTotal: totalIntrareNet,

      calculatedVatTotal: totalTvaCalculated,
      calculatedGrandTotal: totalGeneralCalculated,

      costsMap: localCostsMap,

      // Folosite pentru afisare erori la submit
      invoicesTotalNoVatRON: calculatedInvoicesNoVatRON,

      // Folosite pentru culori (Verde/Rosu)
      isBalancedNoVat: isBalancedNoVat,
      isBalancedWithVat: isBalancedWithVat,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues])

  // Urmărim valoarea din selectorul de destinație
  const destinationLocation = form.watch('destinationLocation')

  // 1. Când se schimbă furnizorul
  const handleSupplierChange = async (
    id: string,
    item: SearchResult | null
  ) => {
    // Logica existentă
    form.setValue('supplier', id, { shouldValidate: true })
    setSelectedSupplier(item)

    // Logica nouă: Resetăm comanda și aducem lista
    form.setValue('orderRef', undefined)
    setSelectedOrderData(null)
    setOpenOrders([])

    if (id) {
      setIsLoadingOrders(true)
      const orders = await getOpenOrdersBySupplier(id)
      setOpenOrders(orders)
      setIsLoadingOrders(false)
    }
  }

  // 2. Când se selectează o comandă din dropdown
  const handleOrderChange = async (orderId: string) => {
    form.setValue('orderRef', orderId)
    if (!orderId) {
      setSelectedOrderData(null)
      return
    }
    const fullOrder = await getOrderDetailsForReception(orderId)
    if (fullOrder) {
      setSelectedOrderData(fullOrder)
    }
  }

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
                          onChange={(id, item) =>
                            handleSupplierChange(id, item)
                          }
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
                        <Select
                          disabled={
                            !selectedSupplier ||
                            isLoadingOrders ||
                            openOrders.length === 0
                          }
                          onValueChange={(val) => handleOrderChange(val)}
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  isLoadingOrders
                                    ? 'Se caută comenzi...'
                                    : openOrders.length === 0
                                      ? 'Nicio comandă deschisă'
                                      : 'Selectează o comandă'
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {openOrders.map((ord) => (
                              <SelectItem
                                key={ord._id}
                                value={ord._id}
                                textValue={`#${ord.orderNumber} ${ord.supplierOrderNumber ? `(Ref: ${ord.supplierOrderNumber})` : ''} - ${formatCurrency(ord.totalValue)}`}
                              >
                                <div className='flex flex-col text-left'>
                                  {/* Linia 1: Număr intern și dată internă */}
                                  <span className='font-medium'>
                                    #{ord.orderNumber} -{' '}
                                    {new Date(ord.orderDate).toLocaleDateString(
                                      'ro-RO'
                                    )}
                                  </span>

                                  {/* Linia 2: Detalii Furnizor (dacă există) */}
                                  {ord.supplierOrderNumber && (
                                    <span className='text-xs text-muted-foreground'>
                                      Ref. Furnizor: #{ord.supplierOrderNumber}
                                      {ord.supplierOrderDate &&
                                        ` din ${new Date(ord.supplierOrderDate).toLocaleDateString('ro-RO')}`}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                </div>
              </CardContent>
            </Card>
            {/* Livrări Fizice (Aviz, Șofer, Mașină) */}
            <div className='md:col-span-2'>
              <ReceptionDeliveries vatRates={vatRates} isVatPayer={true} />
            </div>
          </div>
          {/* CARD 2: Pentru Facturi */}
          <ReceptionInvoices
            vatRates={vatRates}
            defaultVatRate={defaultVatRate}
            isVatPayer={selectedSupplier?.isVatPayer ?? false}
          />
          {/* --- ZONA UI: LISTA DE REFERINȚĂ (READ-ONLY CU CONVERSII COMPLETE) --- */}
          {selectedOrderData && (
            <div className='w-full'>
              <Card className='border-dashed border-primary/20 bg-muted/10 mt-0 mb-0'>
                <CardHeader className='mt-0 border-b border-border/50 bg-muted/20'>
                  <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
                    {/* Titlu și Info Comandă */}
                    <div>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <ShoppingCart className='h-4 w-4 text-primary' />
                        Articole de Recepționat
                        <span className='text-muted-foreground font-normal text-sm ml-1'>
                          (Comanda #{selectedOrderData.orderNumber}
                          {selectedOrderData.orderDate &&
                            ` din ${new Date(selectedOrderData.orderDate).toLocaleDateString('ro-RO')}`}
                          )
                        </span>
                        {selectedOrderData.supplierOrderNumber && (
                          <span className='text-xs text-primary'>
                            Ref. Furnizor: #
                            {selectedOrderData.supplierOrderNumber}
                            {selectedOrderData.supplierOrderDate &&
                              ` din ${new Date(selectedOrderData.supplierOrderDate).toLocaleDateString('ro-RO')}`}
                          </span>
                        )}
                      </CardTitle>
                      {selectedOrderData.notes && (
                        <div className='text-xs text-muted-foreground mt-1 flex items-center gap-1'>
                          <Info className='h-3 w-3' /> Note:{' '}
                          {selectedOrderData.notes}
                        </div>
                      )}
                    </div>

                    {/* Detalii Transport (Compact) */}
                    {selectedOrderData.transportDetails && (
                      <div className='flex flex-wrap gap-3 text-xs bg-background/80 p-2 rounded border shadow-sm'>
                        <div
                          className='flex items-center gap-1.5'
                          title='Tip Transport'
                        >
                          <Truck className='h-3.5 w-3.5' />
                          <span className='font-medium'>
                            {selectedOrderData.transportDetails
                              .transportType === 'EXTERN_FURNIZOR'
                              ? 'Furnizor'
                              : selectedOrderData.transportDetails
                                    .transportType === 'TERT'
                                ? 'Terț'
                                : 'Intern'}
                          </span>
                        </div>

                        {/* Cost Transport */}
                        {(selectedOrderData.transportDetails
                          .totalTransportCost || 0) > 0 && (
                          <div className='flex items-center gap-1 pl-3 border-l'>
                            <span className='text-muted-foreground'>
                              Cost / Cursa:
                            </span>
                            <span className='font-medium'>
                              {formatCurrency(
                                selectedOrderData.transportDetails.transportCost
                              )}
                            </span>
                          </div>
                        )}

                        {/* Distanță & Timp (dacă există) */}
                        {(selectedOrderData.transportDetails.distanceInKm ||
                          0) > 0 && (
                          <div
                            className='flex items-center gap-1 pl-3 border-l'
                            title='Distanță estimată'
                          >
                            <MapPin className='h-3 w-3 text-muted-foreground' />
                            <span>
                              {selectedOrderData.transportDetails.distanceInKm}{' '}
                              km
                            </span>
                          </div>
                        )}

                        {/* Număr Curse (dacă e relevant) */}
                        {(selectedOrderData.transportDetails
                          .estimatedTransportCount || 0) > 1 && (
                          <div
                            className='flex items-center gap-1 pl-3 border-l'
                            title='Număr estimat de curse/camioane'
                          >
                            <span className='font-bold text-orange-600'>
                              x
                              {
                                selectedOrderData.transportDetails
                                  .estimatedTransportCount
                              }
                            </span>
                            <span className='text-muted-foreground'>Curse</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                    {/* Lista Produse Comandă */}
                    <div className='space-y-2'>
                      <h5 className='text-sm font-semibold text-muted-foreground flex items-center gap-2'>
                        <Package className='h-4 w-4' /> Produse
                      </h5>
                      {selectedOrderData.products?.map(
                        (item: any, idx: number) => {
                          const remaining = Math.max(
                            0,
                            item.quantityOrdered - (item.quantityReceived || 0)
                          )

                          // --- DEFINIRE VARIABILE (AICI, CA SĂ FIE VIZIBILE PESTE TOT) ---
                          const prodData = item.product || {}
                          const pkgQty = prodData.packagingQuantity || 1 // Câte bucăți sunt într-un bax
                          const itemsPalletRaw = prodData.itemsPerPallet || 0
                          const baseUnit = item.unitMeasure

                          // Calculăm total bucăți pe palet pentru conversie
                          // Logica: Dacă avem baxuri, itemsPerPallet sunt adesea "baxuri pe palet" -> înmulțim.
                          // Dacă nu avem baxuri (pkgQty=1), itemsPerPallet sunt direct bucăți.
                          const totalUnitsPerPallet =
                            pkgQty > 1 && itemsPalletRaw > 0
                              ? itemsPalletRaw * pkgQty
                              : itemsPalletRaw

                          return (
                            <div
                              key={`ord-prod-${idx}`}
                              className='flex flex-col p-3 bg-card rounded border shadow-sm space-y-3'
                            >
                              {/* Header Item */}
                              <div className='flex justify-between items-start'>
                                <div className='font-medium text-sm'>
                                  {item.productName || item.product?.name}
                                  <div className='text-xs text-muted-foreground font-mono mt-0.5'>
                                    {item.productCode || 'Cod: -'}
                                  </div>
                                </div>
                                {/* BADGE REST - MODIFICAT SĂ AFIȘEZE TOT */}
                                <div
                                  className={cn(
                                    'text-xs font-bold px-2 py-1 rounded border text-right flex gap-2 justify-center items-center',
                                    remaining > 0
                                      ? 'bg-orange-500/10 text-orange-600 border-orange-200'
                                      : 'bg-green-500/10 text-green-600 border-green-200'
                                  )}
                                >
                                  <span>
                                    Rest: {remaining} {baseUnit}
                                  </span>

                                  {/* Conversii secundare (doar dacă există rest) */}
                                  {remaining > 0 &&
                                    (pkgQty > 1 || totalUnitsPerPallet > 0) && (
                                      <span className='text-[10px] font-normal opacity-85'>
                                        {/* Conversie BAX */}
                                        {prodData.packagingUnit &&
                                          pkgQty > 1 && (
                                            <>
                                              {(
                                                remaining / pkgQty
                                              ).toLocaleString('ro-RO', {
                                                maximumFractionDigits: 1,
                                              })}{' '}
                                              {prodData.packagingUnit}
                                            </>
                                          )}

                                        {/* Separator dacă avem ambele */}
                                        {prodData.packagingUnit &&
                                          pkgQty > 1 &&
                                          totalUnitsPerPallet > 0 && (
                                            <span className='mx-1'>/</span>
                                          )}

                                        {/* Conversie PALET */}
                                        {totalUnitsPerPallet > 0 && (
                                          <>
                                            {(
                                              remaining / totalUnitsPerPallet
                                            ).toLocaleString('ro-RO', {
                                              maximumFractionDigits: 2,
                                            })}{' '}
                                            Palet
                                          </>
                                        )}
                                      </span>
                                    )}
                                </div>
                              </div>

                              {/* Detalii Conversie Preț & Cantitate */}
                              <div className='grid grid-cols-2 gap-4 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded border border-dashed'>
                                {/* Coloana 1: Status Cantitate (CONVERSII COMPLETE) */}
                                <div>
                                  <div className='font-semibold text-foreground mb-1.5 border-b border-border/50 pb-1'>
                                    Status Cantitate
                                  </div>

                                  {/* Rând: COMANDAT */}
                                  <div className='flex justify-between items-start mb-2'>
                                    <span className='mt-0.5'>Comandat:</span>
                                    <div className='text-right flex flex-col'>
                                      <span className='font-medium text-foreground'>
                                        {item.quantityOrdered} {baseUnit}
                                      </span>
                                      {/* Conversie în BAX */}
                                      {prodData.packagingUnit && pkgQty > 1 && (
                                        <span className=' text-muted-foreground leading-tight'>
                                          (
                                          {(
                                            item.quantityOrdered / pkgQty
                                          ).toLocaleString('ro-RO', {
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          {prodData.packagingUnit})
                                        </span>
                                      )}

                                      {/* Conversie în PALET */}
                                      {totalUnitsPerPallet > 0 && (
                                        <span className=' text-muted-foreground leading-tight'>
                                          (
                                          {(
                                            item.quantityOrdered /
                                            totalUnitsPerPallet
                                          ).toLocaleString('ro-RO', {
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          Palet)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Rând: PRIMIT */}
                                  <div className='flex justify-between items-start'>
                                    <span className='mt-0.5'>Primit:</span>
                                    <div className='text-right flex flex-col'>
                                      <span>
                                        {item.quantityReceived || 0} {baseUnit}
                                      </span>

                                      {/* Conversie în BAX */}
                                      {prodData.packagingUnit && pkgQty > 1 && (
                                        <span className=' text-muted-foreground leading-tight'>
                                          (
                                          {(
                                            (item.quantityReceived || 0) /
                                            pkgQty
                                          ).toLocaleString('ro-RO', {
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          {prodData.packagingUnit})
                                        </span>
                                      )}

                                      {/* Conversie în PALET */}
                                      {totalUnitsPerPallet > 0 && (
                                        <span className=' text-muted-foreground leading-tight'>
                                          (
                                          {(
                                            (item.quantityReceived || 0) /
                                            totalUnitsPerPallet
                                          ).toLocaleString('ro-RO', {
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          Palet)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Rest estimat în Paleți */}
                                  {totalUnitsPerPallet > 0 && remaining > 0 && (
                                    <div className='mt-2 pt-1 border-t border-border/50 text-orange-600/90 font-medium text-right text-[11px]'>
                                      Rest de livrat: ≈{' '}
                                      {(
                                        remaining / totalUnitsPerPallet
                                      ).toLocaleString('ro-RO', {
                                        maximumFractionDigits: 2,
                                      })}{' '}
                                      Paleți
                                    </div>
                                  )}
                                </div>

                                {/* Coloana 2: Info Prețuri (Conversii) */}
                                <div>
                                  <div className='font-semibold text-foreground mb-1.5 border-b border-border/50 pb-1'>
                                    Referință Preț
                                  </div>
                                  <div className='flex justify-between'>
                                    <span>Unitar:</span>
                                    <span className='font-medium text-foreground'>
                                      {formatCurrency(item.pricePerUnit)}
                                    </span>
                                  </div>

                                  {/* Conversie Preț Bax */}
                                  {prodData.packagingUnit && pkgQty > 1 && (
                                    <div className='flex justify-between mt-0.5'>
                                      <span>/ {prodData.packagingUnit}:</span>
                                      <span>
                                        {formatCurrency(
                                          item.pricePerUnit * pkgQty
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {/* Conversie Preț Palet */}
                                  {totalUnitsPerPallet > 0 && (
                                    <div className='flex justify-between mt-0.5 font-medium text-primary'>
                                      <span>/ Palet:</span>
                                      <span>
                                        {formatCurrency(
                                          item.pricePerUnit *
                                            totalUnitsPerPallet
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        }
                      )}
                      {(!selectedOrderData.products ||
                        selectedOrderData.products.length === 0) && (
                        <p className='text-xs text-muted-foreground italic p-2 border border-dashed rounded'>
                          Niciun produs în această comandă.
                        </p>
                      )}
                    </div>

                    {/* Lista Ambalaje Comandă */}
                    <div className='space-y-2'>
                      <h5 className='text-sm font-semibold text-muted-foreground flex items-center gap-2'>
                        <Package className='h-4 w-4' /> Ambalaje
                      </h5>
                      {selectedOrderData.packagingItems?.length > 0 ? (
                        selectedOrderData.packagingItems.map(
                          (item: any, idx: number) => {
                            const remaining = Math.max(
                              0,
                              item.quantityOrdered -
                                (item.quantityReceived || 0)
                            )
                            return (
                              <div
                                key={`ord-pack-${idx}`}
                                className='flex flex-col p-3 bg-card rounded border shadow-sm space-y-2'
                              >
                                <div className='flex justify-between items-start'>
                                  <div className='font-medium text-sm'>
                                    {item.packagingName || item.packaging?.name}
                                  </div>
                                  <span
                                    className={cn(
                                      'text-xs font-bold px-2 py-0.5 rounded border',
                                      remaining > 0
                                        ? 'bg-orange-500/10 text-orange-600 border-orange-200'
                                        : 'bg-green-500/10 text-green-600 border-green-200'
                                    )}
                                  >
                                    Rest: {remaining} {item.unitMeasure}
                                  </span>
                                </div>
                                <div className='text-xs text-muted-foreground bg-muted/40 p-2 rounded border border-dashed'>
                                  <div className='flex justify-between'>
                                    <span>Comandat:</span>
                                    <span className='font-medium'>
                                      {item.quantityOrdered}
                                    </span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span>Primit:</span>
                                    <span>{item.quantityReceived || 0}</span>
                                  </div>
                                  <div className='flex justify-between border-t border-border/50 pt-1 mt-1'>
                                    <span>Preț:</span>
                                    <span>
                                      {formatCurrency(item.pricePerUnit)} /{' '}
                                      {item.unitMeasure}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                        )
                      ) : (
                        <p className='text-xs text-muted-foreground italic p-2 border border-dashed rounded'>
                          Niciun ambalaj în această comandă.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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

                  {/* Afișăm TVA Total (Marfă + Transport) */}
                  {selectedSupplier?.isVatPayer && (
                    <span>
                      TVA Total:{' '}
                      <strong className='text-foreground'>
                        {formatCurrency(calculatedVatTotal)}
                      </strong>
                    </span>
                  )}

                  {/* Total Intrare (NET) */}
                  <span
                    className={cn(
                      'text-base font-semibold border pl-4 ml-2 p-2 rounded-lg',
                      isBalancedNoVat
                        ? 'border-emerald-600/40 text-emerald-400 bg-emerald-600/10'
                        : 'border-red-600/40 text-red-400 bg-red-600/10'
                    )}
                    title={
                      isBalancedNoVat
                        ? 'Balanță OK: Facturi vs Marfă+Transport'
                        : 'Diferență între Facturi și Marfă+Transport'
                    }
                  >
                    TOTAL Intrare:{' '}
                    <strong className='ml-1'>
                      {formatCurrency(grandLandedTotal)}
                    </strong>
                  </span>

                  {/* Total General (BRUT) */}
                  {selectedSupplier?.isVatPayer && (
                    <span
                      className={cn(
                        'text-base font-bold border pl-4 ml-2 p-2 rounded-lg',

                        isBalancedWithVat
                          ? 'border-emerald-600/40 text-emerald-400 bg-emerald-600/10'
                          : 'border-red-600/40 text-red-400 bg-red-600/10'
                      )}
                    >
                      TOTAL General:{' '}
                      <strong>{formatCurrency(calculatedGrandTotal)}</strong>
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <div className='flex items-center gap-2 mb-2'>
                  <ShoppingCart className='h-5 w-5 text-orange-600' />
                  <h4 className='flex gap-2 items-center text-lg font-medium'>
                    Produse
                  </h4>
                  <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium'>
                    {productFields.length}
                  </span>
                </div>

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
                <div className='flex items-center gap-2 mb-2'>
                  <Package className='h-5 w-5 text-orange-600' />
                  <h4 className='text-lg font-medium'>Ambalaje</h4>{' '}
                  <span className='text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium'>
                    {packagingFields.length}
                  </span>
                </div>

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
