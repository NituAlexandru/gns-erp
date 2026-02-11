'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  Save,
  Calendar as CalendarIcon,
  ShoppingCart,
  Package,
  Download,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency, round2 } from '@/lib/utils'

import {
  CreateNirInput,
  NirFormUiSchema,
} from '@/lib/db/modules/financial/nir/nir.validator'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import {
  updateNir,
  createNir,
  loadNirDataFromReceptions,
} from '@/lib/db/modules/financial/nir/nir.actions'
import { NirEditItemRow } from './nir-edit-item-row'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ReceptionSelectorModal } from './reception-selector-modal'
import { AutocompleteSearch } from '../../autocomplete-search'
import { Separator } from '@/components/ui/separator'
import { ReceptionDeliveries } from '../../reception-deliveries'
import { ReceptionInvoices } from '../../reception-invoices'
import {
  createStornoNirAndLink,
  loadNirDataFromDeliveryNote,
} from '@/lib/db/modules/financial/nir/storno.actions'
import { StornoSelectorModal } from './storno-selector-modal'

interface NirFormProps {
  initialData?: any
  userId: string
  userName: string
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
}

export function NirForm({
  initialData,
  userId,
  userName,
  vatRates,
  defaultVatRate,
}: NirFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStornoModalOpen, setIsStornoModalOpen] = useState(false)
  const [stornoContext, setStornoContext] = useState<{
    deliveryNoteId: string
    supplierInvoiceId?: string
  } | null>(null)
  // Verificăm modul: Edit (avem date) sau Create (nu avem)
  const isEditMode = !!initialData?._id

  // --- 1. CONFIGURARE VALORI DEFAULT ---
  const defaultValues = useMemo(() => {
    if (initialData) {
      // CAZUL EDIT
      return {
        ...initialData,
        nirDate: new Date(initialData.nirDate),
        products: initialData.items
          .filter((i: any) => i.stockableItemType === 'ERPProduct')
          .map((p: any) => ({ ...p, product: p.productId })),
        packagingItems: initialData.items
          .filter((i: any) => i.stockableItemType === 'Packaging')
          .map((p: any) => ({ ...p, packaging: p.packagingId })),
        invoices: initialData.invoices.map((i: any) => ({
          ...i,
          date: new Date(i.date),
        })),
        deliveries: initialData.deliveries.map((d: any) => ({
          ...d,
          dispatchNoteDate: new Date(d.dispatchNoteDate),
        })),
      }
    }
    // CAZUL CREATE (Gol)
    return {
      nirDate: new Date(),
      products: [],
      packagingItems: [],
      invoices: [],
      deliveries: [],
      receptionId: [],
      seriesName: '',
      nirNumber: '',
      totals: {
        productsSubtotal: 0,
        productsVat: 0,
        packagingSubtotal: 0,
        packagingVat: 0,
        transportSubtotal: 0,
        transportVat: 0,
        subtotal: 0,
        vatTotal: 0,
        grandTotal: 0,
        totalEntryValue: 0,
      },
    }
  }, [initialData])

  const form = useForm<any>({
    resolver: zodResolver(NirFormUiSchema),
    defaultValues,
  })

  // --- FIELD ARRAYS ---
  const {
    fields: productFields,
    append: appendProduct,
    remove: removeProduct,
    replace: replaceProducts,
  } = useFieldArray({
    control: form.control,
    name: 'products',
  })

  const {
    fields: packagingFields,
    append: appendPackaging,
    remove: removePackaging,
    replace: replacePackaging,
  } = useFieldArray({
    control: form.control,
    name: 'packagingItems',
  })

  // --- 2. LOGICĂ IMPORT RECEPȚII ---
  const handleImportReceptions = async (ids: string[]) => {
    const toastId = toast.loading('Se importă datele...')
    const result = await loadNirDataFromReceptions(ids)

    if (result.success && result.data) {
      const data = result.data

      // Populăm Header-ul
      form.setValue('supplierId', data.supplierId)
      form.setValue('supplierSnapshot', data.supplierSnapshot)
      form.setValue('nirNumber', data.nirNumber)
      form.setValue('seriesName', data.seriesName)
      form.setValue('destinationLocation', data.destinationLocation)
      form.setValue('receptionId', data.receptionId)

      // Populăm Documentele
      form.setValue(
        'invoices',
        data.invoices.map((i: any) => ({ ...i, date: new Date(i.date) })),
      )
      form.setValue(
        'deliveries',
        data.deliveries.map((d: any) => ({
          ...d,
          dispatchNoteDate: new Date(d.dispatchNoteDate),
        })),
      )

      // Populăm Liniile
      const prods = data.items
        .filter((i: any) => i.stockableItemType === 'ERPProduct')
        .map((p: any) => ({ ...p, product: p.productId }))
      const packs = data.items
        .filter((i: any) => i.stockableItemType === 'Packaging')
        .map((p: any) => ({ ...p, packaging: p.packagingId }))

      replaceProducts(prods)
      replacePackaging(packs)

      toast.dismiss(toastId)
      toast.success('Date încărcate cu succes!')
    } else {
      toast.dismiss(toastId)
      toast.error(result.message || 'Eroare la import.')
    }
  }

  // --- 3. CALCULE LIVE ---
  const watchedProducts =
    useWatch({ control: form.control, name: 'products' }) || []
  const watchedPackaging =
    useWatch({ control: form.control, name: 'packagingItems' }) || []
  const watchedDeliveries =
    useWatch({ control: form.control, name: 'deliveries' }) || []

  const calculatedTotals = useMemo(() => {
    // Helper pentru calcul listă
    const calcList = (list: any[]) =>
      list.reduce(
        (acc: any, item: any) => {
          const qty = parseFloat(item.quantity) || 0
          const price = parseFloat(item.invoicePricePerUnit) || 0
          const vatRate = parseFloat(item.vatRate) || 0

          const net = round2(price * qty)
          const vat = round2(net * (vatRate / 100))

          return { net: acc.net + net, vat: acc.vat + vat }
        },
        { net: 0, vat: 0 },
      )

    const pSum = calcList(watchedProducts)
    const pkgSum = calcList(watchedPackaging)

    const transSum = watchedDeliveries.reduce(
      (acc: any, d: any) => {
        const cost = parseFloat(d.transportCost) || 0
        const rate = parseFloat(d.transportVatRate) || 0
        const vat = round2(cost * (rate / 100))
        return { cost: acc.cost + cost, vat: acc.vat + vat }
      },
      { cost: 0, vat: 0 },
    )

    const subtotal = round2(pSum.net + pkgSum.net + transSum.cost)
    const vatTotal = round2(pSum.vat + pkgSum.vat + transSum.vat)
    const grandTotal = round2(subtotal + vatTotal)

    return {
      productsSubtotal: pSum.net,
      productsVat: pSum.vat,
      packagingSubtotal: pkgSum.net,
      packagingVat: pkgSum.vat,
      transportSubtotal: transSum.cost,
      transportVat: transSum.vat,
      subtotal,
      vatTotal,
      grandTotal,
      totalEntryValue: subtotal,
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedProducts,
    watchedPackaging,
    watchedDeliveries,
    productFields.length,
    packagingFields.length,
  ])

  // --- 4. SUBMIT ---
  const onSubmit = async (values: any) => {
    setIsSubmitting(true)
    try {
      // 1. Mapare Produse (Standardizarea datelor)
      const mapItem = (
        p: any,
        type: 'ERPProduct' | 'Packaging',
        idKey: string,
      ) => ({
        ...p,
        stockableItemType: type,
        [idKey]: p[type === 'ERPProduct' ? 'product' : 'packaging'],
        quantity: parseFloat(p.quantity) || 0,
        invoicePricePerUnit: parseFloat(p.invoicePricePerUnit) || 0,
        vatRate: parseFloat(p.vatRate) || 0,
        landedCostPerUnit:
          parseFloat(p.landedCostPerUnit) ||
          parseFloat(p.invoicePricePerUnit) ||
          0,
      })

      const combinedItems = [
        ...(values.products || []).map((p: any) =>
          mapItem(p, 'ERPProduct', 'productId'),
        ),
        ...(values.packagingItems || []).map((p: any) =>
          mapItem(p, 'Packaging', 'packagingId'),
        ),
      ]

      // 2. Construire Payload
      const payload = {
        ...values,
        items: combinedItems,
        totals: calculatedTotals, // Presupun că ai calculul de totaluri disponibil în componentă
        receivedBy: { userId, name: userName },
        receptionId: Array.isArray(values.receptionId)
          ? values.receptionId
          : values.receptionId
            ? [values.receptionId]
            : [],
      }

      // Curățăm câmpurile auxiliare din formular
      delete payload.products
      delete payload.packagingItems

      let result

      // 3. LOGICA DE DECIZIE (Editare vs Storno vs Creare Normală)
      if (isEditMode) {
        // A. Editare NIR existent
        result = await updateNir({
          nirId: initialData._id,
          data: payload as unknown as CreateNirInput,
          userId,
          userName,
        })
      } else if (stornoContext) {
        // B. Creare NIR Storno (din Aviz) - NOU!
        result = await createStornoNirAndLink(
          { ...payload, userId, userName }, // Payload-ul standard + user
          stornoContext.deliveryNoteId,
          stornoContext.supplierInvoiceId,
        )
      } else {
        // C. Creare NIR Normal (Manual sau din Recepție)
        result = await createNir({
          ...payload,
          userId,
          userName,
        })
      }

      // 4. Tratare Rezultat
      if (result.success) {
        toast.success(
          isEditMode ? 'Modificări salvate!' : 'NIR creat cu succes!',
        )
        const redirectId = isEditMode
          ? initialData._id
          : (result as any).data._id // Backend-ul returnează obiectul creat în `data`

        router.push(`/admin/management/reception/nir/${redirectId}`)
        router.refresh()
      } else {
        toast.error('Eroare: ' + result.message)
      }
    } catch (error: any) {
      console.error(error)
      toast.error('Eroare: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- HELPER PT SELECTIE FURNIZOR ---
  const handleSupplierChange = (id: string, item: any) => {
    if (item) {
      form.setValue('supplierId', id)
      form.setValue('supplierSnapshot', {
        name: item.name,
        cui: (item as any).cui || '',
      })
    }
  }

  const handleImportStorno = async (deliveryId: string, invoiceId?: string) => {
    const loadingToast = toast.loading('Se încarcă datele din aviz...')
    try {
      // 1. Încărcăm datele (Server Action)
      const result = await loadNirDataFromDeliveryNote(deliveryId)

      if (!result.success || !result.data) {
        toast.error(result.message || 'Eroare la import')
        toast.dismiss(loadingToast)
        return
      }

      // 2. Populăm formularul cu datele negative
      // Resetăm formularul cu valorile primite
      // Atenție: Trebuie să păstrăm userul curent sau alte default-uri
      form.reset({
        ...result.data, // items, totals, supplierSnapshot
        nirDate: new Date(),
        // Asigură-te că mapezi corect câmpurile din formularul tău
      })

      // 3. Salvăm contextul pentru final (Save)
      setStornoContext({
        deliveryNoteId: deliveryId,
        supplierInvoiceId: invoiceId,
      })

      toast.success('Datele de retur au fost încărcate. Verifică și Salvează.')
    } catch (err) {
      toast.error('Eroare neașteptată.')
    } finally {
      toast.dismiss(loadingToast)
    }
  }

  return (
    <>
      <FormProvider {...form}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle>
                  {isEditMode ? 'Editare NIR' : 'Creare NIR'}
                </CardTitle>

                {!isEditMode && (
                  <div className='flex gap-2'>
                    {/* Buton 1: Import Recepții (Existent) */}
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() => setIsModalOpen(true)}
                    >
                      <Download className='w-4 h-4 mr-2' />
                      Importă din Recepții
                    </Button>

                    {/* Buton 2: Import Storno (NOU) */}
                    <Button
                      type='button'
                      variant='destructive'
                      onClick={() => setIsStornoModalOpen(true)}
                    >
                      <Download className='w-4 h-4 mr-2' />
                      Importă Aviz Retur (Storno)
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className='flex flex-col lg:flex-row gap-8'>
                  <div className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='col-span-1 md:col-span-2'>
                      <FormField
                        name='supplierId'
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className='flex flex-col'>
                            <FormLabel>Furnizor</FormLabel>
                            <AutocompleteSearch
                              searchType='supplier'
                              value={field.value}
                              initialSelectedItem={
                                form.getValues('supplierSnapshot')?.name
                                  ? {
                                      _id: field.value,
                                      name: form.getValues('supplierSnapshot')
                                        .name,
                                    }
                                  : undefined
                              }
                              onChange={handleSupplierChange}
                            />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className='col-span-1'>
                      <FormField
                        control={form.control}
                        name='nirNumber'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Număr NIR</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className='font-mono font-semibold'
                                placeholder='ex: 00055'
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className='col-span-1'>
                      <FormField
                        control={form.control}
                        name='nirDate'
                        render={({ field }) => (
                          <FormItem className='flex flex-col'>
                            <FormLabel>Data Document</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant='outline'
                                  className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'dd.MM.yyyy')
                                  ) : (
                                    <span>Alege data</span>
                                  )}
                                  <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className='w-auto p-0'
                                align='start'
                              >
                                <Calendar
                                  mode='single'
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className='hidden lg:block w-px bg-border mx-2'></div>

                  <div className='w-full lg:w-[350px] flex flex-col justify-center space-y-3'>
                    <h4 className='text-sm font-semibold text-muted-foreground uppercase mb-2'>
                      Sumar Live
                    </h4>
                    <div className='flex justify-between text-sm'>
                      <span>Marfă:</span>
                      <span className='font-medium'>
                        {formatCurrency(calculatedTotals.productsSubtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Ambalaje:</span>
                      <span className='font-medium'>
                        {formatCurrency(calculatedTotals.packagingSubtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Transport:</span>
                      <span className='font-medium'>
                        {formatCurrency(calculatedTotals.transportSubtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span>Total TVA:</span>
                      <span>{formatCurrency(calculatedTotals.vatTotal)}</span>
                    </div>
                    <Separator className='my-2' />
                    <div className='flex justify-between items-end'>
                      <span className='font-bold text-sm'>TOTAL PLATĂ:</span>
                      <span className='font-bold text-xl text-primary'>
                        {formatCurrency(calculatedTotals.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ReceptionDeliveries vatRates={vatRates} isVatPayer={true} />
            <ReceptionInvoices
              vatRates={vatRates}
              defaultVatRate={defaultVatRate}
              isVatPayer={true}
            />

            {/* TABEL PRODUSE */}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between py-4'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <ShoppingCart className='h-5 w-5 text-orange-600' /> Produse
                </CardTitle>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    appendProduct({
                      product: '',
                      quantity: 1,
                      documentQuantity: 1,
                      quantityDifference: 0,
                      unitMeasure: 'bucata',
                      invoicePricePerUnit: 0,
                      vatRate: defaultVatRate?.rate || 0,
                      qualityDetails: {
                        lotNumbers: [],
                        certificateNumbers: [],
                        testReports: [],
                        additionalNotes: '',
                      },
                    })
                  }
                >
                  + Adaugă Produs
                </Button>
              </CardHeader>
              <CardContent className='p-0 overflow-visible'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/50 text-xs uppercase'>
                    <tr>
                      <th className='px-4 py-3 text-left'>#</th>
                      <th className='px-4 py-3 text-left min-w-[200px]'>
                        Denumire
                      </th>
                      <th className='px-4 py-3 text-left'>U.M.</th>
                      <th className='px-4 py-3 text-right'>Cant.</th>
                      <th className='px-4 py-3 text-right'>Preț</th>
                      <th className='px-4 py-3 text-right'>TVA %</th>
                      <th className='px-4 py-3 text-right'>Total Net</th>
                      <th className='px-4 py-3 text-center'>Act</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    {productFields.map((field, index) => (
                      <NirEditItemRow
                        key={field.id}
                        index={index}
                        form={form}
                        itemType='products'
                        onRemove={() => removeProduct(index)}
                        vatRates={vatRates}
                      />
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* TABEL AMBALAJE */}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between py-4'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <Package className='h-5 w-5 text-orange-600' /> Ambalaje
                </CardTitle>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    appendPackaging({
                      packaging: '',
                      quantity: 1,
                      documentQuantity: 1,
                      quantityDifference: 0,
                      unitMeasure: 'bucata',
                      invoicePricePerUnit: 0,
                      vatRate: defaultVatRate?.rate || 0,
                      qualityDetails: {
                        lotNumbers: [],
                        certificateNumbers: [],
                        testReports: [],
                        additionalNotes: '',
                      },
                    })
                  }
                >
                  + Adaugă Ambalaj
                </Button>
              </CardHeader>
              <CardContent className='p-0 overflow-visible'>
                <table className='w-full text-sm'>
                  <tbody className='divide-y'>
                    {packagingFields.map((field, index) => (
                      <NirEditItemRow
                        key={field.id}
                        index={index}
                        form={form}
                        itemType='packagingItems'
                        onRemove={() => removePackaging(index)}
                        vatRates={vatRates}
                      />
                    ))}
                  </tbody>
                </table>
                {/* FOOTER TOTALURI */}
                <div className='p-4 border-t bg-muted/20'>
                  <div className='flex flex-col md:flex-row justify-end gap-6 text-sm'>
                    <div className='flex flex-col items-end border-r pr-6 last:border-0'>
                      <span className='text-muted-foreground text-xs uppercase'>
                        Subtotal Marfă
                      </span>
                      <span className='font-bold text-base'>
                        {formatCurrency(calculatedTotals.productsSubtotal)}
                      </span>
                    </div>
                    <div className='flex flex-col items-end border-r pr-6 last:border-0'>
                      <span className='text-muted-foreground text-xs uppercase'>
                        Subtotal Ambalaje
                      </span>
                      <span className='font-bold text-base'>
                        {formatCurrency(calculatedTotals.packagingSubtotal)}
                      </span>
                    </div>
                    <div className='flex flex-col items-end border-r pr-6 last:border-0'>
                      <span className='text-muted-foreground text-xs uppercase'>
                        Total TVA
                      </span>
                      <span className='font-bold text-base'>
                        {formatCurrency(calculatedTotals.vatTotal)}
                      </span>
                    </div>
                    <div className='flex flex-col items-end bg-primary/10 p-2 rounded'>
                      <span className='text-primary font-semibold text-xs uppercase'>
                        TOTAL GENERAL (NIR)
                      </span>
                      <span className='font-black text-xl text-primary'>
                        {formatCurrency(calculatedTotals.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className='flex justify-end gap-4 pt-2'>
              <Button
                variant='outline'
                type='button'
                onClick={() => router.back()}
              >
                Anulează
              </Button>
              <Button
                type='submit'
                disabled={isSubmitting}
                className='min-w-[150px]'
              >
                {isSubmitting ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <>
                    <Save className='w-4 h-4 mr-2' />{' '}
                    {isEditMode ? 'Salvează Modificările' : 'Creează NIR'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </FormProvider>

      <ReceptionSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleImportReceptions}
      />
      <StornoSelectorModal
        isOpen={isStornoModalOpen}
        onClose={() => setIsStornoModalOpen(false)}
        onConfirm={handleImportStorno}
      />
    </>
  )
}
