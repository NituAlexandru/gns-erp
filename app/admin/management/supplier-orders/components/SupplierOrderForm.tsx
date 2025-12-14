'use client'

import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { MapPin, Phone, User, Navigation, Clock, Building2 } from 'lucide-react'

import {
  SupplierOrderCreateInput,
  SupplierOrderCreateSchema,
} from '@/lib/db/modules/supplier-orders/supplier-order.validator'
import {
  createSupplierOrder,
  updateSupplierOrder,
  getFullSupplierDetails,
} from '@/lib/db/modules/supplier-orders/supplier-order.actions'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import {
  ISupplierOrderDoc,
  IFullSupplierDetails,
  ILoadingAddress,
} from '@/lib/db/modules/supplier-orders/supplier-order.types'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import { SupplierSelector } from './SupplierSelector'
import { SupplierOrderLogistics } from './SupplierOrderLogistics'
import { SupplierOrderItemsManager } from './SupplierOrderItemsManager'
import { SupplierOrderTotals } from './SupplierOrderTotals'
import { SearchResult } from '../../reception/autocomplete-search'
import { SupplierOrderStatus } from '@/lib/db/modules/supplier-orders/supplier-order.constants'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'

interface SupplierOrderFormProps {
  initialData?: ISupplierOrderDoc
  vatRates: VatRateDTO[]
  isEditing?: boolean
}

export function SupplierOrderForm({
  initialData,
  vatRates,
  isEditing = false,
}: SupplierOrderFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [supplierDetails, setSupplierDetails] =
    useState<IFullSupplierDetails | null>(null)
  const [selectedLoadingAddressId, setSelectedLoadingAddressId] =
    useState<string>('')

  const defaultVatRateValue = vatRates.find((v) => v.isDefault)?.rate ?? 0

  // Preparare date inițiale pentru UI (conversie sigură la string)
  const initialSupplier = initialData
    ? ({
        _id: initialData.supplier.toString(),
        name: initialData.supplierSnapshot?.name,
      } as SearchResult)
    : undefined

  const initialProducts = initialData?.products?.map((p) => {
    // Forțăm cast-ul pentru a accesa proprietățile populate din backend
    const rawProduct = p.product as unknown as any

    return {
      _id: rawProduct._id?.toString() || rawProduct.toString(),
      name: rawProduct.name || p.productName,
      productCode: rawProduct.productCode || p.productCode,

      // CRITIC: Astea sunt câmpurile care permit calcularea "Paletului" în tabel
      unit: rawProduct.unit || 'bucata',
      packagingUnit: rawProduct.packagingUnit,
      packagingQuantity: rawProduct.packagingQuantity,
      itemsPerPallet: rawProduct.itemsPerPallet,
    }
  }) as SearchResult[] | undefined

  const initialPackaging = initialData?.packagingItems?.map((p) => {
    const rawPkg = p.packaging as unknown as any

    return {
      _id: rawPkg._id?.toString() || rawPkg.toString(),
      name: rawPkg.name || p.packagingName,
      productCode: rawPkg.productCode || p.productCode,

      // CRITIC PENTRU AMBALAJE
      unit: rawPkg.unit || 'bucata',
      packagingUnit: rawPkg.packagingUnit,
      packagingQuantity: rawPkg.packagingQuantity,
      itemsPerPallet: undefined, // Ambalajele de obicei nu au paleți de paleți
    }
  }) as SearchResult[] | undefined

  const form = useForm<SupplierOrderCreateInput>({
    resolver: zodResolver(SupplierOrderCreateSchema),
    defaultValues: initialData
      ? {
          // --- HEADERS ---
          supplier:
            initialData.supplier &&
            typeof initialData.supplier === 'object' &&
            '_id' in initialData.supplier
              ? (initialData.supplier as any)._id.toString()
              : initialData.supplier.toString(),
          orderDate: initialData.orderDate
            ? new Date(initialData.orderDate)
            : new Date(),
          supplierOrderNumber: initialData.supplierOrderNumber || '',
          supplierOrderDate: initialData.supplierOrderDate
            ? new Date(initialData.supplierOrderDate)
            : undefined,
          destinationLocation: initialData.destinationLocation as any,
          destinationType: initialData.destinationType,
          notes: initialData.notes || '', // Evităm null

          // --- PRODUSE (Mapare Explicită) ---
          products: initialData.products.map((p) => {
            // FIX: Verificăm dacă e obiect populat sau string simplu
            const productId =
              p.product && typeof p.product === 'object' && '_id' in p.product
                ? (p.product as any)._id.toString()
                : p.product.toString()

            return {
              _id: p._id?.toString(),
              product: productId, // <--- Folosim ID-ul extras corect
              productName: p.productName,
              productCode: p.productCode,

              // Valori Originale (Prioritare)
              quantityOrdered: p.originalQuantity ?? p.quantityOrdered,
              unitMeasure: p.originalUnitMeasure ?? p.unitMeasure,
              pricePerUnit: p.originalPricePerUnit ?? p.pricePerUnit,

              originalQuantity: p.originalQuantity,
              originalUnitMeasure: p.originalUnitMeasure,
              originalPricePerUnit: p.originalPricePerUnit,

              vatRate: p.vatRate,
            }
          }),

          packagingItems: initialData.packagingItems.map((p) => {
            // FIX: Aceeași logică și pentru ambalaje
            const packagingId =
              p.packaging &&
              typeof p.packaging === 'object' &&
              '_id' in p.packaging
                ? (p.packaging as any)._id.toString()
                : p.packaging.toString()

            return {
              _id: p._id?.toString(),
              packaging: packagingId,
              packagingName: p.packagingName,
              productCode: p.productCode,
              quantityOrdered: p.originalQuantity ?? p.quantityOrdered,
              unitMeasure: p.originalUnitMeasure ?? p.unitMeasure,
              pricePerUnit: p.originalPricePerUnit ?? p.pricePerUnit,
              originalQuantity: p.originalQuantity,
              originalUnitMeasure: p.originalUnitMeasure,
              originalPricePerUnit: p.originalPricePerUnit,
              vatRate: p.vatRate,
            }
          }),

          // --- LOGISTICĂ ---
          transportDetails: {
            transportType: initialData.transportDetails.transportType,
            transportCost: initialData.transportDetails.transportCost || 0,
            estimatedTransportCount:
              initialData.transportDetails.estimatedTransportCount || 1,
            totalTransportCost:
              initialData.transportDetails.totalTransportCost || 0,
            transportVatRate:
              initialData.transportDetails.transportVatRate ??
              defaultVatRateValue,

            // Mapăm și noile câmpuri de logistică
            distanceInKm: initialData.transportDetails.distanceInKm,
            travelTimeInMinutes:
              initialData.transportDetails.travelTimeInMinutes,
            driverName: initialData.transportDetails.driverName || '',
            carNumber: initialData.transportDetails.carNumber || '',
            notes: initialData.transportDetails.notes || '',
          },
        }
      : {
          // --- VALORI DEFAULT PENTRU CREARE ---
          currency: 'RON',
          exchangeRate: 1,
          orderDate: new Date(),
          supplierOrderNumber: '',
          notes: '',
          destinationLocation: 'DEPOZIT',
          destinationType: 'DEPOZIT',
          products: [],
          packagingItems: [],
          transportDetails: {
            transportType: 'INTERN',
            transportCost: 0,
            estimatedTransportCount: 1,
            totalTransportCost: 0,
            transportVatRate: defaultVatRateValue,
            driverName: '',
            carNumber: '',
            notes: '',
          },
        },
  })

  const selectedSupplierId = useWatch({
    control: form.control,
    name: 'supplier',
  })

  // --- Handler Memoizat ---
  const handleLoadingAddressChange = (addressId: string) => {
    setSelectedLoadingAddressId(addressId)

    // Căutăm în state-ul existent
    const selectedAddr = supplierDetails?.loadingAddresses?.find(
      (a: any) => a._id === addressId
    )

    if (selectedAddr) {
      if (selectedAddr.distanceInKm) {
        form.setValue(
          'transportDetails.distanceInKm',
          selectedAddr.distanceInKm
        )
      }
      if (selectedAddr.travelTimeInMinutes) {
        form.setValue(
          'transportDetails.travelTimeInMinutes',
          selectedAddr.travelTimeInMinutes
        )
      }
    }
  }

  // --- Effect ---
  useEffect(() => {
    if (!selectedSupplierId) {
      setSupplierDetails(null)
      setSelectedLoadingAddressId('')
      return
    }

    const fetchDetails = async () => {
      try {
        const details = (await getFullSupplierDetails(
          selectedSupplierId
        )) as unknown as IFullSupplierDetails
        setSupplierDetails(details)

        // LOGICĂ INLINE: Nu mai apelăm handler-ul extern pentru a evita dependența ciclică
        if (details?.loadingAddresses?.length === 1) {
          const addr = details.loadingAddresses[0]
          setSelectedLoadingAddressId(addr._id)

          // Setăm valorile direct folosind datele proaspăt aduse
          if (addr.distanceInKm) {
            form.setValue('transportDetails.distanceInKm', addr.distanceInKm)
          }
          if (addr.travelTimeInMinutes) {
            form.setValue(
              'transportDetails.travelTimeInMinutes',
              addr.travelTimeInMinutes
            )
          }
        } else {
          // Resetăm selecția dacă schimbăm furnizorul și are mai multe adrese (sau niciuna)
          setSelectedLoadingAddressId('')
        }
      } catch (error) {
        console.error('Failed to fetch supplier details', error)
      }
    }

    fetchDetails()
    // DEPENDENȚE: Doar ID-ul și form (care e stabil). NU includem handler-ul sau supplierDetails.
  }, [selectedSupplierId, form])

  const activeLoadingAddress = supplierDetails?.loadingAddresses?.find(
    (a) => a._id === selectedLoadingAddressId
  )

  async function onSubmit(
    data: SupplierOrderCreateInput,
    targetStatus: SupplierOrderStatus // 'DRAFT' | 'CONFIRMED'
  ) {
    startTransition(async () => {
      // Injectăm statusul dorit în payload
      const payload = { ...data, status: targetStatus }

      let result
      if (isEditing && initialData?._id) {
        result = await updateSupplierOrder({ ...payload, _id: initialData._id })
      } else {
        result = await createSupplierOrder(payload)
      }

      if (result.success) {
        toast.success(
          targetStatus === 'DRAFT'
            ? 'Ciorna a fost salvată.'
            : 'Comanda a fost confirmată.'
        )
        router.push('/admin/management/supplier-orders')
      } else {
        toast.error('Eroare', { description: result.message })
      }
    })
  }

  return (
    <Form {...form}>
      <form className='space-y-4' onSubmit={(e) => e.preventDefault()}>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>
            {isEditing && initialData ? (
              <span>
                Modificare Comandă nr. {initialData.orderNumber}
                {initialData.orderDate
                  ? ' - ' +
                    new Date(initialData.orderDate).toLocaleDateString('ro-RO')
                  : ''}
                {(initialData.supplierOrderNumber ||
                  initialData.supplierOrderDate) && (
                  <span className='ml-2 text-muted-foreground font-medium'>
                    (Ref. Furnizor: {initialData.supplierOrderNumber || '-'}
                    {initialData.supplierOrderDate
                      ? ' - ' +
                        new Date(
                          initialData.supplierOrderDate
                        ).toLocaleDateString('ro-RO')
                      : ''}
                    )
                  </span>
                )}
              </span>
            ) : (
              'Comandă Nouă Furnizor'
            )}
          </h1>
        </div>

        {/* Layout Principal Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch'>
          {/* COL 1: Furnizor și Detalii */}
          <div className='p-4 border rounded-lg flex flex-col space-y-4 bg-card h-full'>
            <SupplierSelector
              selectedSupplierId={selectedSupplierId}
              initialSupplierData={initialSupplier}
              onSelect={(id) =>
                form.setValue('supplier', id, { shouldValidate: true })
              }
              readOnly={isEditing && initialData?.status !== 'DRAFT'}
            />

            {/* DETALII FURNIZOR */}
            {supplierDetails && (
              <div className='space-y-3'>
                {/* Selector */}
                {supplierDetails.loadingAddresses?.length > 0 && (
                  <div className='space-y-1'>
                    <FormLabel className='text-xs font-semibold text-muted-foreground uppercase'>
                      Punct de Încărcare
                    </FormLabel>
                    <Select
                      value={selectedLoadingAddressId}
                      onValueChange={(val) => handleLoadingAddressChange(val)}
                      disabled={isEditing && initialData?.status !== 'DRAFT'}
                    >
                      <SelectTrigger className='h-8 text-sm w-full'>
                        <SelectValue placeholder='Selectează adresa...' />
                      </SelectTrigger>
                      <SelectContent>
                        {supplierDetails.loadingAddresses.map((addr) => (
                          <SelectItem key={addr._id} value={addr._id}>
                            {addr.judet}, {addr.localitate}, Str. {addr.strada},
                            nr. {addr.numar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Card Detalii */}
                {activeLoadingAddress ? (
                  <div className='p-3 bg-muted/40 rounded-md border text-sm space-y-2.5'>
                    <div className='flex items-start gap-2'>
                      <MapPin className='h-4 w-4 text-primary shrink-0 mt-0.5' />
                      <div>
                        <div className='font-medium text-foreground'>
                          Str. {activeLoadingAddress.strada}, nr.{' '}
                          {activeLoadingAddress.numar},{' '}
                          {activeLoadingAddress.alteDetalii}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {activeLoadingAddress.localitate},{' '}
                          {activeLoadingAddress.judet}
                        </div>
                      </div>
                    </div>

                    {(activeLoadingAddress.persoanaContact ||
                      activeLoadingAddress.telefonContact) && (
                      <div className='grid grid-cols-1 gap-1 pt-1'>
                        {activeLoadingAddress.persoanaContact && (
                          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                            <User className='h-3.5 w-3.5' />
                            <span className='truncate'>
                              {activeLoadingAddress.persoanaContact}
                            </span>
                          </div>
                        )}
                        {activeLoadingAddress.telefonContact && (
                          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                            <Phone className='h-3.5 w-3.5' />
                            <span>{activeLoadingAddress.telefonContact}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(activeLoadingAddress.distanceInKm ||
                      activeLoadingAddress.travelTimeInMinutes) && (
                      <div className='flex items-center gap-4 pt-2 border-t border-dashed'>
                        {activeLoadingAddress.distanceInKm && (
                          <div
                            className='flex items-center gap-1.5'
                            title='Distanța Estimată'
                          >
                            <Navigation className='h-3.5 w-3.5 text-blue-500' />
                            <span className='text-xs font-semibold'>
                              {activeLoadingAddress.distanceInKm} km
                            </span>
                          </div>
                        )}
                        {activeLoadingAddress.travelTimeInMinutes && (
                          <div
                            className='flex items-center gap-1.5'
                            title='Timp Estimat'
                          >
                            <Clock className='h-3.5 w-3.5 text-orange-500' />
                            <span className='text-xs font-semibold'>
                              {formatMinutes(
                                activeLoadingAddress.travelTimeInMinutes
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Fallback: Sediul Social
                  <div className='p-3 bg-muted/20 rounded-md border text-sm flex items-start gap-2'>
                    <Building2 className='h-4 w-4 text-muted-foreground shrink-0 mt-0.5' />
                    <div>
                      <div className='font-medium text-foreground'>
                        Sediul Social
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {supplierDetails.address?.localitate},{' '}
                        {supplierDetails.address?.judet}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className='grid grid-cols-1 gap-4 pt-2 border-t'>
              <FormField
                name='supplierOrderNumber'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nr. Comandă Furnizor</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='Ex: CF-2024/001'
                        value={field.value || ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                name='supplierOrderDate'
                control={form.control}
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>Dată Comandă Furnizor</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ro })
                            ) : (
                              <span>Alege dată</span>
                            )}
                            <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className='w-auto p-0' align='start'>
                        <Calendar
                          mode='single'
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name='destinationLocation'
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locație Destinație (Recepție)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='w-full cursor-pointer'>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVENTORY_LOCATIONS.map((loc) => (
                        <SelectItem
                          key={loc}
                          value={loc}
                          className='cursor-pointer'
                        >
                          {LOCATION_NAMES_MAP[loc]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* COL 2: Logistică */}
          <div className='p-4 border rounded-lg flex flex-col h-full bg-card'>
            <h2 className='text-lg font-semibold mb-4'>Logistică</h2>
            <SupplierOrderLogistics form={form} vatRates={vatRates} />
          </div>

          {/* COL 3: Totaluri */}
          <div className=' flex flex-col gap-4'>
            <SupplierOrderTotals />
            {/* COL: Note */}
            <div className='p-4 border rounded-lg flex flex-col space-y-2 bg-card'>
              <h2 className='text-lg font-semibold'>Alte Detalii</h2>
              <FormField
                name='notes'
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='hidden'>Note Interne</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='Detalii suplimentare...'
                        className='h-full min-h-[100px] resize-none'
                        value={field.value || ''}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* Manager Produse */}
        <div className='p-4 border rounded-lg bg-card'>
          <SupplierOrderItemsManager
            form={form}
            vatRates={vatRates}
            initialProductsData={initialProducts}
            initialPackagingData={initialPackaging}
            defaultVatRate={defaultVatRateValue}
          />
        </div>
        {/* Butoane Acțiune (JOS) */}
        <div className='flex justify-end gap-4'>
          {/* Buton Salvează Ciornă */}
          <Button
            type='button'
            variant='outline'
            disabled={isPending}
            onClick={form.handleSubmit((data) => onSubmit(data, 'DRAFT'))}
          >
            {isPending ? 'Se procesează...' : 'Salvează Ciornă'}
          </Button>

          {/* Buton Confirmă Comanda */}
          <Button
            type='button'
            disabled={isPending}
            onClick={form.handleSubmit((data) => onSubmit(data, 'CONFIRMED'))}
            className='bg-red-500 hover:bg-red-600'
          >
            {isPending
              ? 'Se procesează...'
              : isEditing
                ? 'Actualizează și Confirmă'
                : 'Confirmă Comanda'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
