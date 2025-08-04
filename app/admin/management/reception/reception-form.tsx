'use client'

import { useRouter } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { useMemo, useState } from 'react'
import { CalendarIcon, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
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

type Project = { _id: string; name: string }

// Denumiri prietenoase locatii
const locationDisplayMap = {
  DEPOZIT: 'Depozit (marfa intră fizic la noi)',
  IN_TRANZIT: 'În Tranzit (a plecat de la furnizor)',
  LIVRARE_DIRECTA: 'Livrare Directă (la client/șantier)',
  CUSTODIE_FURNIZOR: 'Custodie la Furnizor (plătită, dar nelivrată)',
  CUSTODIE_GNS: 'Custodie la GNS (livrată, dar neplătită)',
  CUSTODIE_PENTRU_CLIENT:
    'Custodie pentru Client (plătită de client, nelivrată)',
}

// Definim o valoare unică pentru opțiunea de proiect
const PROJECT_OPTION_VALUE = 'PROIECT'

type ReceptionFormProps = {
  initialData?: PopulatedReception
}

export function ReceptionForm({ initialData }: ReceptionFormProps) {
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projects] = useState<Project[]>([
    { _id: 'proj1', name: 'Proiect Rezidențial Central' },
    { _id: 'proj2', name: 'Renovare Birouri Corporative' },
  ])

  const isEditMode = !!initialData

  const form = useForm<ReceptionCreateInput>({
    defaultValues: initialData
      ? // Mod de editare:
        {
          createdBy: initialData.createdBy,
          supplier: initialData.supplier?._id || '',
          receptionDate: new Date(initialData.receptionDate),
          destinationLocation: initialData.destinationLocation,
          destinationType: initialData.destinationType,
          destinationId: initialData.destinationId,
          products:
            initialData.products?.map((p) => ({
              ...p,
              product: p.product._id,
            })) || [],
          packagingItems:
            initialData.packagingItems?.map((p) => ({
              ...p,
              packaging: p.packaging._id,
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
              amount: i.amount,
            })) || [],
        }
      : // Mod de creare:
        {
          createdBy: '',
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
  const {
    fields: deliveryFields,
    append: appendDelivery,
    remove: removeDelivery,
  } = useFieldArray({
    control: form.control,
    name: 'deliveries',
  })
  const {
    fields: invoiceFields,
    append: appendInvoice,
    remove: removeInvoice,
  } = useFieldArray({
    control: form.control,
    name: 'invoices',
  })

  const watchedProducts = form.watch('products')
  const watchedPackagingItems = form.watch('packagingItems')
  const watchedInvoices = form.watch('invoices')
  const productsDependency = JSON.stringify(watchedProducts)
  const packagingDependency = JSON.stringify(watchedPackagingItems)
  const invoicesDependency = JSON.stringify(watchedInvoices)

  const summaryTotals = useMemo(() => {
    const productsTotal = (watchedProducts || []).reduce((sum, item) => {
      const price = item.priceAtReception ?? 0
      const quantity = item.quantity ?? 0
      return sum + price * quantity
    }, 0)

    const packagingTotal = (watchedPackagingItems || []).reduce((sum, item) => {
      const price = item.priceAtReception ?? 0
      const quantity = item.quantity ?? 0
      return sum + price * quantity
    }, 0)

    return {
      productsTotal,
      packagingTotal,
      grandTotal: productsTotal + packagingTotal,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsDependency, packagingDependency])

  const invoicesTotal = useMemo(() => {
    return (watchedInvoices || []).reduce(
      (sum, invoice) => sum + (invoice.amount || 0),
      0
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoicesDependency])

  // Urmărim valoarea din selectorul de destinație
  const destinationLocation = form.watch('destinationLocation')

  async function onSubmit(values: ReceptionCreateInput, isFinal: boolean) {
    setIsSubmitting(true)

    if (isFinal) {
      const itemsGrandTotal = summaryTotals.grandTotal

      // Rotunjim la 2 zecimale pentru a evita erorile de calcul cu numere zecimale
      if (invoicesTotal.toFixed(2) !== itemsGrandTotal.toFixed(2)) {
        toast.error('Verificare eșuată', {
          description: `Suma totală a facturilor introduse (${formatCurrency(
            invoicesTotal
          )}) nu corespunde cu valoarea totală a articolelor adăugate (${formatCurrency(
            itemsGrandTotal
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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => onSubmit(data, true))}
        className='space-y-6'
      >
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Card>
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

              {/* --- SECȚIUNEA PENTRU DESTINAȚIE, RECONSTRUITĂ CONFORM CERINȚEI --- */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
          <Card>
            <CardHeader>
              <CardTitle>Livrări Fizice (Aviz, Șofer, Mașină)</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {deliveryFields.map((field, index) => (
                <div key={field.id} className='p-3 border rounded-lg space-y-3'>
                  <div className='flex items-end gap-2'>
                    <FormField
                      name={`deliveries.${index}.dispatchNoteSeries`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serie Aviz</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name={`deliveries.${index}.dispatchNoteNumber`}
                      render={({ field }) => (
                        <FormItem className='flex-1'>
                          <FormLabel>
                            Număr Aviz{' '}
                            <span>
                              * <span className='text-red-500'>*</span>
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name={`deliveries.${index}.dispatchNoteDate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Data Aviz{' '}
                            <span>
                              * <span className='text-red-500'>*</span>
                            </span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className='mr-2 h-4 w-4' />
                                  {field.value ? (
                                    format(new Date(field.value), 'PPP', {
                                      locale: ro,
                                    })
                                  ) : (
                                    <span>Alege data</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className='w-auto p-0'>
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
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='text-destructive'
                      onClick={() => removeDelivery(index)}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-2'>
                    <FormField
                      name={`deliveries.${index}.driverName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nume Șofer</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Popescu Ion'
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name={`deliveries.${index}.carNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Număr Auto</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='B123XYZ'
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name={`deliveries.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mențiuni Livrare</FormLabel>
                          <FormControl>
                            <Input
                              placeholder='ex: palet deteriorat'
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              <Button
                type='button'
                variant='outline'
                onClick={() =>
                  appendDelivery({
                    dispatchNoteSeries: '',
                    dispatchNoteNumber: '',
                    dispatchNoteDate: new Date(),
                    driverName: '',
                    carNumber: '',
                    notes: '',
                  })
                }
              >
                Adaugă Livrare
              </Button>
            </CardContent>
          </Card>
        </div>
        {/* CARD 2: Pentru Facturi */}
        <Card className='col-span-1 md:col-span-2'>
          <CardHeader>
            <CardTitle>Detalii Facturare</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {invoiceFields.map((field, index) => (
              <div
                key={field.id}
                className='flex items-end gap-2 p-2 border rounded-md'
              >
                <FormField
                  name={`invoices.${index}.series`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Serie Factură <span className='text-red-500'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  name={`invoices.${index}.number`}
                  render={({ field }) => (
                    <FormItem className='flex-1'>
                      <FormLabel>
                        Număr Factură <span className='text-red-500'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`invoices.${index}.date`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Data Factură <span className='text-red-500'>*</span>
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className='mr-2 h-4 w-4' />
                              {field.value ? (
                                format(new Date(field.value), 'PPP', {
                                  locale: ro,
                                })
                              ) : (
                                <span>Alege data</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0'>
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
                  name={`invoices.${index}.amount`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className='flex-1'>
                      <FormLabel>
                        Suma Factură <span className='text-red-500'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          step='0.01'
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ''
                                ? null
                                : parseFloat(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type='button'
                  variant='destructive'
                  size='icon'
                  onClick={() => removeInvoice(index)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            ))}
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                appendInvoice({
                  series: '',
                  number: '',
                  date: new Date(),
                  amount: 0,
                })
              }
            >
              Adaugă Factură
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex justify-between items-center'>
              <span>Articole Recepționate</span>
              <div className='text-sm font-normal text-muted-foreground space-x-4 flex items-center'>
                <span>
                  Produse:{' '}
                  <strong className='text-foreground'>
                    {formatCurrency(summaryTotals.productsTotal)}
                  </strong>
                </span>
                <span>
                  Ambalaje:{' '}
                  <strong className='text-foreground'>
                    {formatCurrency(summaryTotals.packagingTotal)}
                  </strong>
                </span>
                <span className='text-base'>
                  TOTAL:{' '}
                  <strong className='text-foreground'>
                    {formatCurrency(summaryTotals.grandTotal)}
                  </strong>
                </span>
                <span className='text-base font-semibold border-l pl-4'>
                  TOTAL Facturi introduse:{' '}
                  <strong
                    className={cn(
                      'transition-colors',
                      invoicesTotal.toFixed(2) ===
                        summaryTotals.grandTotal.toFixed(2)
                        ? 'text-green-600' // Verde dacă sumele sunt egale
                        : 'text-red-500' // Roșu dacă sunt diferite
                    )}
                  >
                    {formatCurrency(invoicesTotal)}
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
                    priceAtReception: null,
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
                    priceAtReception: null,
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
            onClick={() => form.handleSubmit((data) => onSubmit(data, false))()}
          >
            {isSubmitting ? 'Se salvează...' : 'Salvează Ciornă'}
          </Button>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Se finalizează...' : 'Salvează și Finalizează'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
