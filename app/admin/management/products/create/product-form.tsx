'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FieldErrors, useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { UploadButton } from '@/lib/uploadthing'
import { Checkbox } from '@/components/ui/checkbox'
import { toSlug } from '@/lib/utils'
import { Trash } from 'lucide-react'
import { NO_PALLET, UNITS } from '@/lib/constants'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { IProductDoc, IProductInput } from '@/lib/db/modules/product/types'
import {
  ProductInputSchema,
  ProductUpdateSchema,
} from '@/lib/db/modules/product/validator'
import {
  createProduct,
  updateProduct,
} from '@/lib/db/modules/product/product.actions'
import { ISupplierDoc } from '@/lib/db/modules/suppliers'
import { ICategoryDoc } from '@/lib/db/modules/category/category.model'
import { InfoTooltip } from '@/components/shared/info-tooltip'
import {
  FIELD_LABELS_RO,
  FIELD_PLACEHOLDERS_RO,
} from '@/lib/db/modules/product/constants'

const zeroMarkups = {
  markupDirectDeliveryPrice: 0,
  markupFullTruckPrice: 0,
  markupSmallDeliveryBusinessPrice: 0,
  markupRetailPrice: 0,
}

const productDefaultValues: IProductInput =
  process.env.NODE_ENV === 'development'
    ? {
        name: 'Sample Product',
        slug: 'sample-product',
        category: '',
        images: [],
        brand: 'Sample Brand',
        mainSupplier: '',
        description: '',
        numSales: 0,
        isPublished: false,
        barCode: '',
        productCode: '',
        mainCategory: '',
        unit: 'bucata',
        packagingUnit: 'bucata',
        packagingQuantity: 1,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        volume: 0,
        specifications: [],
        itemsPerPallet: 1,
        palletTypeId: '',
        minStock: 0,
        countInStock: 0,
        averagePurchasePrice: 0,
        defaultMarkups: zeroMarkups,
        clientMarkups: [],
      }
    : {
        name: '',
        slug: '',
        images: [],
        brand: '',
        mainSupplier: '',
        description: '',
        numSales: 0,
        isPublished: false,
        productCode: '',
        barCode: '',
        category: '',
        mainCategory: '',
        unit: 'bucata',
        packagingUnit: 'bucata',
        packagingQuantity: 1,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        volume: 0,
        specifications: [],
        itemsPerPallet: 1,
        palletTypeId: '',
        minStock: 0,
        countInStock: 0,
        averagePurchasePrice: 0,
        defaultMarkups: zeroMarkups,
        clientMarkups: [],
      }

// extrage ID-ul în mod sigur
const getIdFromStringOrObject = (value: unknown): string => {
  // Dacă valoarea este deja un string (ID), îl returnăm
  if (typeof value === 'string') {
    return value
  }
  // Dacă este un obiect care are o proprietate _id de tip string, returnăm acel _id
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const id = (value as { _id: unknown })._id
    if (typeof id === 'string') {
      return id
    }
  }
  // În orice alt caz, returnăm un string gol
  return ''
}

const ProductForm = ({
  type,
  product,
  productId,
}: {
  type: 'Create' | 'Update'
  product?: IProductDoc
  productId?: string
}) => {
  const router = useRouter()
  const [supplierQuery, setSupplierQuery] = useState('')
  const [supplierOptions, setSupplierOptions] = useState<ISupplierDoc[]>([])
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [mainCategories, setMainCategories] = useState<ICategoryDoc[]>([])
  const [allSubCategories, setAllSubCategories] = useState<ICategoryDoc[]>([])
  const [subCategories, setSubCategories] = useState<ICategoryDoc[]>([])
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)

  async function handleGenerateCode() {
    setIsGeneratingCode(true)
    try {
      const res = await fetch('/api/admin/products/generate-code')
      const data = await res.json()
      if (data.success) {
        form.setValue('productCode', data.code, { shouldValidate: true })
      } else {
        toast({
          title: 'Eroare',
          description: data.message,
        })
      }
    } catch {
      toast({
        title: 'Eroare',
        description: 'Nu s-a putut genera codul.',
      })
    } finally {
      setIsGeneratingCode(false)
    }
  }

  const form = useForm<IProductInput>({
    resolver: zodResolver(ProductInputSchema),
    defaultValues:
      product && type === 'Update'
        ? {
            name: product.name,
            slug: product.slug,
            images: product.images,
            brand: product.brand ?? '',
            description: product.description,
            numSales: product.numSales,
            isPublished: product.isPublished,
            productCode: product.productCode,
            barCode: product.barCode ?? '',
            unit: product.unit,
            packagingUnit: product.packagingUnit,
            packagingQuantity: product.packagingQuantity,
            length: product.length,
            width: product.width,
            height: product.height,
            weight: product.weight,
            volume: product.volume,
            specifications: product.specifications,
            itemsPerPallet: product.itemsPerPallet,
            minStock: product.minStock,
            countInStock: product.countInStock,
            averagePurchasePrice: product.averagePurchasePrice,
            defaultMarkups: product.defaultMarkups,
            clientMarkups: product.clientMarkups,
            mainSupplier: getIdFromStringOrObject(product.mainSupplier),
            mainCategory: getIdFromStringOrObject(product.mainCategory),
            category: getIdFromStringOrObject(product.category),
            palletTypeId: product.palletTypeId ?? NO_PALLET,
          }
        : {
            ...productDefaultValues,
            palletTypeId: NO_PALLET,
            category: '',
          },
  })

  const { watch, setValue, control, setError, clearErrors } = form

  const [length, width, height] = watch(['length', 'width', 'height'])

  const nameValue = watch('name')

  // recalc volume whenever length/width/height change
  useEffect(() => {
    if (length > 0 && width > 0 && height > 0) {
      const vol = parseFloat(
        ((length / 100) * (width / 100) * (height / 100)).toFixed(3)
      )
      setValue('volume', vol, { shouldValidate: true })
    }
  }, [length, width, height, setValue])

  useEffect(() => {
    if (supplierQuery.length < 2) {
      setSupplierOptions([])
      return
    }
    const t = setTimeout(() => {
      fetch(
        `/api/admin/management/suppliers/search?q=${encodeURIComponent(supplierQuery)}`
      )
        .then((r) => r.json())
        .then(setSupplierOptions)
        .catch(console.error)
    }, 300)
    return () => clearTimeout(t)
  }, [supplierQuery])

  // Fetch main categories once:
  useEffect(() => {
    fetch('/api/admin/categories/main')
      .then((r) => r.json())
      .then((categories: ICategoryDoc[]) => {
        // Filtrez array-ul pentru a exclude categoria cu numele "Ambalaje"
        const filteredCategories = categories.filter(
          (cat) => cat.name !== 'Ambalaje'
        ) // Setez în state doar lista filtrată
        setMainCategories(filteredCategories)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((res) => setAllSubCategories(res.data))
      .catch(console.error)
  }, [])

  // Re-compute subCategories whenever the selected mainCategory changes:
  const selectedMain = watch('mainCategory')

  useEffect(() => {
    if (selectedMain) {
      setSubCategories(
        allSubCategories.filter((c) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mc = c.mainCategory as any
          const id = typeof mc === 'string' ? mc : mc?._id
          return id === selectedMain
        })
      )
    } else {
      setSubCategories([])
    }
  }, [selectedMain, allSubCategories])

  useEffect(() => {
    if (nameValue) {
      setValue('slug', toSlug(nameValue), { shouldValidate: true })
    } else {
      setValue('slug', '')
    }
  }, [nameValue, setValue])

  useEffect(() => {
    // Acest efect rulează doar în modul 'Update' pentru a seta numele furnizorului
    if (type === 'Update' && product?.mainSupplier) {
      if (
        typeof product.mainSupplier === 'object' &&
        product.mainSupplier !== null &&
        'name' in product.mainSupplier
      ) {
        const supplierName = (product.mainSupplier as ISupplierDoc).name

        if (typeof supplierName === 'string') {
          setSupplierQuery(supplierName)
        }
      }
    }
  }, [product, type])

  const { toast } = useToast()

  const images = form.watch('images')

  const buttonText =
    type === 'Create' ? 'Crează Produs' : 'Salvează Modificările'
  const submittingText =
    type === 'Create' ? 'Se crează produsul…' : 'Se salvează…'

  const onFormError = (errors: FieldErrors<IProductInput>) => {
    console.error('Erori de validare formular:', errors)
    toast({
      title: 'Formular invalid',
      description: 'Te rog verifică câmpurile marcate cu erori.',
    })
  }

  const checkProductCodeUniqueness = async (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const code = e.target.value.trim()
    if (!code || type !== 'Create') {
      clearErrors('productCode')
      return
    }
    const res = await fetch(
      `/api/admin/products/check-code?code=${encodeURIComponent(code)}`
    )
    const data = await res.json()
    if (!data.isAvailable) {
      setError('productCode', {
        type: 'manual',
        message: 'Acest cod de produs este deja utilizat.',
      })
    } else {
      clearErrors('productCode')
    }
  }

  const checkBarCodeUniqueness = async (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    const code = e.target.value.trim()
    if (!code || type !== 'Create') {
      clearErrors('barCode')
      return
    }
    const res = await fetch(
      `/api/admin/products/check-barcode?code=${encodeURIComponent(code)}`
    )
    const data = await res.json()
    if (!data.isAvailable) {
      setError('barCode', {
        type: 'manual',
        message: 'Acest cod de bare este deja utilizat.',
      })
    } else {
      clearErrors('barCode')
    }
  }
  async function onSubmit(values: IProductInput) {
    const payload: IProductInput = values
    // --- Verificare de unicitate pe client, înainte de submit ---
    if (type === 'Create') {
      // 1. Verificăm codul de produs
      const codeRes = await fetch(
        `/api/admin/products/check-code?code=${encodeURIComponent(values.productCode)}`
      )
      const codeData = await codeRes.json()
      if (!codeData.isAvailable) {
        toast({
          title: 'Eroare',
          description: 'Acest cod de produs este deja utilizat.',
        })
        return
      }

      // 2. Verificăm codul de bare, doar dacă a fost introdus
      if (values.barCode) {
        const barcodeRes = await fetch(
          `/api/admin/products/check-barcode?code=${encodeURIComponent(values.barCode)}`
        )
        const barcodeData = await barcodeRes.json()
        if (!barcodeData.isAvailable) {
          toast({
            title: 'Eroare',
            description: 'Acest cod de bare este deja utilizat.',
          })
          return 
        }
      }
    }
    // --- Sfârșitul verificării pe client ---

    if (type === 'Create') {
      const res = await createProduct(payload)
      if (!res.success) {
        toast({ title: 'Eroare la creare', description: res.message })
      } else {
        toast({ description: res.message })
        router.push(`/admin/products`)
      }
      return
    }

    if (type === 'Update') {
      if (!productId) {
        console.error('Product ID is missing for update')
        return
      }

      // Construim obiectul final pentru update, adăugând ID-ul
      const dataToUpdate = { ...payload, _id: productId }

      // Validăm manual acest obiect cu schema de UPDATE
      const result = ProductUpdateSchema.safeParse(dataToUpdate)

      // Verificăm dacă validarea manuală a eșuat
      if (!result.success) {
        console.error('Update validation failed:', result.error.flatten())
        toast({
          title: 'Eroare de validare la salvare',
          description: 'Datele finale nu sunt corecte.',
        })
        return
      }

      // Dacă totul e OK, trimitem datele validate la server
      const res = await updateProduct(result.data)
      if (!res.success) {
        toast({ title: 'Eroare la actualizare', description: res.message })
      } else {
        toast({ description: res.message })
        router.push(`/admin/products`)
      }
    }
  }

  return (
    <Form {...form}>
      <p className='text-sm text-muted-foreground mb-4'>
        Câmpurile marcate cu <span className='text-red-500'>*</span> sunt
        obligatorii.
      </p>
      <form
        method='post'
        onSubmit={form.handleSubmit(onSubmit, onFormError)}
        className='space-y-4'
      >
        {/* câmp slug ascuns, generat automat */}
        <input type='hidden' {...form.register('slug')} />
        {/* code, name and slug */}
        <div className='flex flex-col gap-5 md:flex-row'>
          {/* Cod produs */}
          <FormField
            control={form.control}
            name='productCode'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>
                  Cod Produs<span className='text-red-500'>*</span>
                </FormLabel>
                <div className='flex gap-2'>
                  <FormControl>
                    <Input
                      placeholder='Cod produs'
                      {...field}
                      onBlur={checkProductCodeUniqueness}
                    />
                  </FormControl>
                  <Button
                    className='w-[75px] text-xs'
                    type='button'
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                  >
                    {isGeneratingCode ? '...' : 'Generează'}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />{' '}
          {/* Cod de bare */}
          <FormField
            control={form.control}
            name='barCode'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>
                  Cod de bare<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='Introduceți codul de bare'
                    {...field}
                    onBlur={checkBarCodeUniqueness}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Nume produs */}
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>
                  Nume Produs<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder='Introduceți numele produsului'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Furnizor */}
          <FormField
            control={form.control}
            name='mainSupplier'
            render={({ field }) => {
              const displayName =
                supplierOptions.find((s) => s._id === field.value)?.name ??
                supplierQuery

              return (
                <FormItem className='w-full relative'>
                  <FormLabel>
                    Furnizor<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input
                        value={displayName}
                        onChange={(e) => {
                          setSupplierQuery(e.target.value)
                          setSupplierOpen(true)
                        }}
                        onFocus={() => setSupplierOpen(true)}
                        onBlur={() => {
                          // close on blur
                          setTimeout(() => setSupplierOpen(false), 0)
                        }}
                        placeholder='Caută după nume sau CUI…'
                      />
                      {(displayName || supplierQuery) && (
                        <Button
                          variant='default'
                          size='sm'
                          aria-label='Clear supplier'
                          className='absolute right-[2px] top-1/2 -translate-y-1/2'
                          onClick={() => {
                            field.onChange('') // clear the form value
                            setSupplierQuery('') // clear the query text
                            setSupplierOpen(false) // close dropdown
                          }}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />

                  {supplierOpen && supplierOptions.length > 0 && (
                    <ul
                      className='absolute z-10 mt-1 w-full max-h-[200px] overflow-auto rounded border bg-popover top-14'
                      onMouseDown={(e) => {
                        e.preventDefault()
                      }}
                    >
                      {supplierOptions.map((s) => (
                        <li
                          key={s._id}
                          className='px-3 py-1 cursor-pointer hover:bg-accent'
                          onClick={() => {
                            field.onChange(s._id)
                            setSupplierQuery(s.name)
                            setSupplierOpen(false)
                          }}
                        >
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </FormItem>
              )
            }}
          />
          <FormField
            control={form.control}
            name='brand'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder='Introduceți brandul' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Category, Brand, Unit */}
        <div className='flex flex-col gap-5 md:flex-row'>
          {/* Categorie Generală */}
          <FormField
            control={form.control}
            name='mainCategory'
            render={({ field }) => (
              <FormItem className='w-1/5'>
                <FormLabel>
                  {' '}
                  <InfoTooltip
                    content={
                      <>
                        <div className='mb-1 '>
                          Alege categoria produsului: ambalaj, materiale de
                          construcții
                        </div>
                        <i className='text-muted-foreground'>
                          De ex. pentru palet - ambalaj, caramida - materiale de
                          construcții, oțel beton - materiale de construcții etc
                        </i>
                      </>
                    }
                  />
                  Categorie Generală<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className='w-full cursor-pointer'>
                      <SelectValue placeholder='Selectați categoria' />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Subcategorie */}
          <FormField
            control={form.control}
            name='category'
            render={({ field }) => (
              <FormItem className='w-1/5'>
                <FormLabel>
                  {' '}
                  <InfoTooltip
                    content={
                      <>
                        <div className='mb-1 '>
                          Alege categoria produsului: bca, oțel beton, cărămidă,
                          cărămidă aparentă etc.
                        </div>
                      </>
                    }
                  />
                  Subcategorie <span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <SelectTrigger className='w-full cursor-pointer'>
                      <SelectValue placeholder='Selectați subcategoria' />
                    </SelectTrigger>
                    <SelectContent>
                      {subCategories.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Unit */}
          <FormField
            control={form.control}
            name='unit'
            render={({ field }) => (
              <FormItem className='w-1/5 '>
                <FormLabel>
                  <InfoTooltip
                    content={
                      <>
                        <div className='mb-1 '>
                          Alege unitatea de măsură a produsul: palet, sac,
                          bucată, cutie, bax, kg etc.
                        </div>
                        <i className='text-muted-foreground'>
                          De ex. pentru caramida - bucată, liant - kg, BCA - m3,
                          polistiren - m2, cuie - kg, diblu - bucată etc
                        </i>
                      </>
                    }
                  />
                  Unitate Măsură<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                  >
                    <SelectTrigger className='w-full cursor-pointer'>
                      <SelectValue placeholder='Selectați unitatea' />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Packaging Unit - Unitatea de măsură */}
          <FormField
            control={control}
            name='packagingUnit'
            render={({ field }) => (
              <FormItem className='w-1/5'>
                <FormLabel>
                  <InfoTooltip
                    content={
                      <>
                        <div className='mb-1'>
                          Alege modul în care se ambalează produsul: palet, sac,
                          bucată, cutie, bax, kg etc.
                        </div>
                        <i className='text-muted-foreground'>
                          De ex. pentru cuie - cutie, caramida - palet, liant -
                          sac
                        </i>
                      </>
                    }
                  />
                  Mod Ambalare Produs<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className='cursor-pointer w-full'>
                      <SelectValue placeholder='Selectați unitatea' />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Packaging Quantity - nr. produse in ambalaj */}
          <FormField
            control={control}
            name='packagingQuantity'
            render={({ field }) => (
              <FormItem className='w-1/5'>
                <FormLabel>
                  <InfoTooltip
                    content={
                      <>
                        <div className='mb-1'>
                          Adaugă numărul de produse din ambalajul respectiv
                        </div>
                        <i className='text-muted-foreground'>
                          De ex. 96 cărămizi în palet, 5 kg cuie în cutie, 25 kg
                          liant în sac, 100 bucăți dibluri în pungă etc.
                        </i>
                      </>
                    }
                  />
                  Nr. Produse în Ambalaj<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.001'
                    placeholder='e.g. 96.250'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Dimensiuni + volum calculat automat + Greutate */}
        <div className='flex gap-4'>
          {(['length', 'width', 'height'] as const).map((d) => (
            <FormField
              key={d}
              control={form.control}
              name={d}
              render={({ field }) => (
                <FormItem className='w-1/5'>
                  <FormLabel>
                    {FIELD_LABELS_RO[d]}
                    <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder={FIELD_PLACEHOLDERS_RO[d]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          {/* Volume (read-only) */}
          <FormField
            control={form.control}
            name='volume'
            render={({ field }) => (
              <FormItem className='w-1/5'>
                <FormLabel>
                  Volum (m³){' '}
                  <span className='text-muted-foreground'>
                    - calculat automat
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    readOnly
                    placeholder='Calculat automat…'
                    className='bg-muted/10 cursor-not-allowed'
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Greutate */}
          <FormField
            control={form.control}
            name='weight'
            render={({ field }) => (
              <FormItem className='w-1/5'>
                <FormLabel>
                  Greutate (kg)<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='Introduceți greutatea'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Is Published */}
        <div>
          <FormField
            control={form.control}
            name='isPublished'
            render={({ field }) => (
              <FormItem className='space-x-2 items-center flex'>
                <FormControl>
                  <Checkbox
                    className='cursor-pointer'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>
                  Publicat? <span className='text-red-500'>*</span>
                </FormLabel>
              </FormItem>
            )}
          />
        </div>
        {/* Images */}
        <div className='flex flex-col gap-5 md:flex-row'>
          <FormField
            control={form.control}
            name='images'
            render={() => (
              <FormItem className='w-3/5 flex flex-col gap-2'>
                <FormLabel>
                  Imagine<span className='text-red-500'>*</span>
                </FormLabel>
                <Card className='p-0 pt-2 flex'>
                  <CardContent className='space-y-2 h-38 p-2 py-0'>
                    <div className='flex justify-start items-center space-x-1'>
                      {images.map((image: string) => (
                        <Card key={image} className='relative p-0 '>
                          <Image
                            src={image}
                            alt='imagine produs'
                            className='w-36 h-36 object-cover object-center rounded-sm'
                            width={100}
                            height={100}
                          />
                          <Button
                            variant={'default'}
                            className='absolute top-1 right-1'
                            type='button'
                            onClick={() => {
                              form.setValue(
                                'images',
                                images.filter((img) => img !== image)
                              )
                            }}
                          >
                            <Trash />
                          </Button>
                        </Card>
                      ))}
                      <FormControl>
                        <UploadButton
                          endpoint='imageUploader'
                          className='bg-red-500 text-white pb-2 rounded red:bg-blue-600'
                          onClientUploadComplete={(
                            res: { ufsUrl: string }[]
                          ) => {
                            form.setValue('images', [...images, res[0].ufsUrl])
                          }}
                          onUploadError={(error: Error) => {
                            toast({
                              description: `ERROR! ${error.message}`,
                            })
                          }}
                        />
                      </FormControl>
                    </div>
                  </CardContent>
                </Card>
                <FormMessage />
              </FormItem>
            )}
          />{' '}
          {/* Description */}
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>
                  Descriere <span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Introduceți o descriere detaliată a produsului...'
                    className='resize-none min-h-40 rounded-xl'
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Technical Specifications */}
        <FormField
          control={form.control}
          name='specifications'
          render={({ field }) => {
            const specsArray = Array.isArray(field.value) ? field.value : []
            return (
              <FormItem className='w-full'>
                <FormLabel>Specificații Tehnice</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Una pe rând, separate de : (Ex: Greutate: 5kg)'
                    className=' min-h-52'
                    value={specsArray.join('\n')}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? [] : e.target.value.split('\n')
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <div>
          <Button
            type='submit'
            size='lg'
            disabled={form.formState.isSubmitting}
            className='button col-span-2 w-full'
          >
            {form.formState.isSubmitting ? submittingText : buttonText}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ProductForm
