'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, FormProvider, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  Save,
  Hash,
  Calendar as CalendarIcon,
  ShoppingCart,
  Package,
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
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency, round2 } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

import {
  CreateNirInput,
  EditNirInput,
  EditNirSchema,
} from '@/lib/db/modules/financial/nir/nir.validator'
import { NirDTO } from '@/lib/db/modules/financial/nir/nir.types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { updateNir } from '@/lib/db/modules/financial/nir/nir.actions'
import { NirEditItemRow } from './nir-edit-item-row'
import { AutocompleteSearch } from '../../../autocomplete-search'
import { ReceptionDeliveries } from '../../../reception-deliveries'
import { ReceptionInvoices } from '../../../reception-invoices'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface NirEditFormProps {
  initialData: NirDTO
  userId: string
  userName: string
  vatRates: VatRateDTO[]
  defaultVatRate: VatRateDTO | null
}

export function NirEditForm({
  initialData,
  userId,
  userName,
  vatRates,
  defaultVatRate,
}: NirEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Separăm itemii în două categorii (Produse și Ambalaje)
  const defaultProducts = initialData.items
    .filter((i) => i.stockableItemType === 'ERPProduct')
    .map((p) => ({ ...p, product: p.productId }))

  const defaultPackaging = initialData.items
    .filter((i) => i.stockableItemType === 'Packaging')
    .map((p) => ({ ...p, packaging: p.packagingId }))

  const form = useForm<any>({
    resolver: zodResolver(EditNirSchema),
    defaultValues: {
      ...initialData,
      nirDate: new Date(initialData.nirDate),
      products: defaultProducts,
      packagingItems: defaultPackaging,
      invoices: initialData.invoices.map((i) => ({
        ...i,
        date: new Date(i.date),
      })),
      deliveries: initialData.deliveries.map((d) => ({
        ...d,
        dispatchNoteDate: new Date(d.dispatchNoteDate),
      })),
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

  // --- LOGICĂ CALCULE CU useWatch PENTRU REVEAL INSTANT ---
  const watchedProducts = useWatch({ control: form.control, name: 'products' })
  const watchedPackaging = useWatch({
    control: form.control,
    name: 'packagingItems',
  })
  const watchedDeliveries = useWatch({
    control: form.control,
    name: 'deliveries',
  })

  const calculatedTotals = useMemo(() => {
    const pSum = (watchedProducts || []).reduce(
      (acc: any, item: any) => {
        const net = round2(
          (parseFloat(item.invoicePricePerUnit) || 0) *
            (parseFloat(item.quantity) || 0),
        )
        const vat = round2(net * ((parseFloat(item.vatRate) || 0) / 100))
        return { net: acc.net + net, vat: acc.vat + vat }
      },
      { net: 0, vat: 0 },
    )

    const pkgSum = (watchedPackaging || []).reduce(
      (acc: any, item: any) => {
        const net = round2(
          (parseFloat(item.invoicePricePerUnit) || 0) *
            (parseFloat(item.quantity) || 0),
        )
        const vat = round2(net * ((parseFloat(item.vatRate) || 0) / 100))
        return { net: acc.net + net, vat: acc.vat + vat }
      },
      { net: 0, vat: 0 },
    )

    const transSum = (watchedDeliveries || []).reduce(
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

    return {
      productsSubtotal: pSum.net,
      productsVat: pSum.vat,
      packagingSubtotal: pkgSum.net,
      packagingVat: pkgSum.vat,
      transportSubtotal: transSum.cost,
      transportVat: transSum.vat,
      subtotal,
      vatTotal,
      grandTotal: round2(subtotal + vatTotal),
      totalEntryValue: subtotal,
    }
  }, [watchedProducts, watchedPackaging, watchedDeliveries])

  const onSubmit = async (values: any) => {
    setIsSubmitting(true)
    try {
      const combinedItems = [
        ...(values.products || []).map((p: any) => ({
          ...p,
          stockableItemType: 'ERPProduct',
          productId: p.product,
          landedCostPerUnit: p.invoicePricePerUnit,
        })),
        ...(values.packagingItems || []).map((p: any) => ({
          ...p,
          stockableItemType: 'Packaging',
          packagingId: p.packaging,
          landedCostPerUnit: p.invoicePricePerUnit,
        })),
      ]

      const payload = {
        ...values,
        items: combinedItems,
        totals: calculatedTotals,
      }

      const result = await updateNir({
        nirId: initialData._id,
        data: payload as unknown as CreateNirInput,
        userId,
        userName,
      })

      if (result.success) {
        toast.success('NIR actualizat cu succes!')
        router.push(`/admin/management/reception/nir/${initialData._id}`)
        router.refresh()
      } else {
        toast.error('Eroare: ' + result.message)
      }
    } catch (error: any) {
      toast.error('Eroare: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSupplierChange = (id: string, item: any) => {
    if (item) {
      form.setValue('supplierId', id)
      form.setValue('supplierSnapshot', {
        name: item.name,
        cui: (item as any).cui || '',
      })
    }
  }

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Date Generale Document</CardTitle>
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
                            initialSelectedItem={{
                              _id: initialData.supplierId,
                              name: initialData.supplierSnapshot.name,
                            }}
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
                'Salvez...'
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' /> Salvează Modificările
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </FormProvider>
  )
}
