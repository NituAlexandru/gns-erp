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
import { ICategoryDoc } from '@/lib/db/modules/category/category.model'
import { InfoTooltip } from '@/components/shared/info-tooltip'
import {
  FIELD_LABELS_RO,
  FIELD_PLACEHOLDERS_RO,
} from '@/lib/db/modules/product/constants'
import { ISupplierDoc } from '@/lib/db/modules/suppliers/types'
import { toast } from 'sonner'

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
        description: '',
        isPublished: true,
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
        itemsPerPallet: 0,
        palletTypeId: '',
        defaultMarkups: zeroMarkups,
        clientMarkups: [],
        suppliers: [],
      }
    : {
        name: '',
        slug: '',
        images: [],
        brand: '',
        description: '',
        isPublished: true,
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
        itemsPerPallet: 0,
        palletTypeId: '',
        defaultMarkups: zeroMarkups,
        clientMarkups: [],
        suppliers: [],
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
  const [mainCategories, setMainCategories] = useState<ICategoryDoc[]>([])
  const [allSubCategories, setAllSubCategories] = useState<ICategoryDoc[]>([])
  const [subCategories, setSubCategories] = useState<ICategoryDoc[]>([])
  const [isGeneratingCode, setIsGeneratingCode] = useState(false)
  const [isGeneratingBarCode, setIsGeneratingBarCode] = useState(false)
  async function handleGenerateCode() {
    setIsGeneratingCode(true)
    try {
      const res = await fetch('/api/admin/products/generate-code')
      const data = await res.json()
      if (data.success) {
        form.setValue('productCode', data.code, { shouldValidate: true })
      } else {
        toast.error('Eroare', {
          description: data.message,
        })
      }
    } catch {
      toast.error('Eroare', {
        description: 'Nu s-a putut genera codul.',
      })
    } finally {
      setIsGeneratingCode(false)
    }
  }
  async function handleGenerateBarCode() {
    setIsGeneratingBarCode(true)
    try {
      // Apelăm ruta creată de tine
      const res = await fetch('/api/barcode/generate-barcode')
      const data = await res.json()

      if (data.success) {
        // Punem codul în input
        form.setValue('barCode', data.code, { shouldValidate: true })
        // Ștergem erorile dacă existau
        form.clearErrors('barCode')
        toast.success('Cod generat cu succes', {
          description: data.code,
        })
      } else {
        toast.error('Eroare', {
          description: data.message,
        })
      }
    } catch (error) {
      toast.error('Eroare', {
        description: 'Nu s-a putut genera codul.',
      })
    } finally {
      setIsGeneratingBarCode(false)
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
            defaultMarkups: product.defaultMarkups,
            clientMarkups: product.clientMarkups,
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

  const images = form.watch('images')

  const buttonText =
    type === 'Create' ? 'Crează Produs' : 'Salvează Modificările'
  const submittingText =
    type === 'Create' ? 'Se crează produsul…' : 'Se salvează…'

  const onFormError = (errors: FieldErrors<IProductInput>) => {
    console.error('Erori validare:', errors)

    if (errors.productCode) {
      toast.error('Eroare Cod Produs', {
        description: errors.productCode.message,
      })
      return
    }
    if (errors.barCode) {
      toast.error('Eroare Cod de Bare', {
        description: errors.barCode.message,
      })
      return
    }
    if (errors.name) {
      toast.error('Lipsește Numele', {
        description: 'Te rog introdu un nume pentru produs.',
      })
      return
    }

    toast.error('Formular incomplet', {
      description: `Există ${Object.keys(errors).length} erori. Verifică câmpurile roșii.`,
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
      toast.error('Cod duplicat!', {
        description: `Codul "${code}" este deja alocat.`,
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
      toast.error('Cod de bare existent!', {
        description: `Codul "${code}" există deja în baza de date.`,
      })
    } else {
      clearErrors('barCode')
    }
  }
  async function onSubmit(values: IProductInput) {
    if (type === 'Create') {
      const res = await createProduct(values)
      if (!res.success) {
        // ERROR
        toast.error('Eroare la creare', { description: res.message })
      } else {
        // SUCCESS
        toast.success(res.message)
        router.push(`/admin/products`)
      }
      return
    }

    if (type === 'Update') {
      if (!productId) {
        console.error('Product ID is missing for update')
        return
      }

      // Extragem câmpurile pe care NU vrem să le trimitem la update
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { defaultMarkups, clientMarkups, ...payloadForUpdate } = values

      const dataToUpdate = { ...payloadForUpdate, _id: productId }

      const result = ProductUpdateSchema.safeParse(dataToUpdate)

      if (!result.success) {
        toast.error('Eroare de validare', {
          description: 'Datele nu sunt corecte.',
        })
        return
      }

      const res = await updateProduct(result.data)
      if (!res.success) {
        // ERROR UPDATE
        toast.error('Eroare la actualizare', { description: res.message })
      } else {
        // SUCCESS UPDATE
        toast.success(res.message)
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
                <div className='flex gap-2'>
                  <FormControl>
                    <Input
                      placeholder='Scanează sau generează...'
                      {...field}
                      // Păstrăm verificarea ta de unicitate la onBlur (când scrii manual)
                      onBlur={(e) => {
                        field.onBlur()
                        checkBarCodeUniqueness(e)
                      }}
                    />
                  </FormControl>
                  <Button
                    className='w-[75px] text-xs'
                    type='button' // Important: type='button' ca să nu dea submit la form
                    onClick={handleGenerateBarCode}
                    disabled={
                      isGeneratingBarCode || form.formState.isSubmitting
                    }
                  >
                    {isGeneratingBarCode ? '...' : 'Generează'}
                  </Button>
                </div>
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
                    <SelectContent className='bg-white dark:bg-muted'>
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
                    <SelectContent className='bg-white dark:bg-muted'>
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
                    <SelectContent className='bg-white dark:bg-muted'>
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
                  UM Ambalare<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className='cursor-pointer w-full'>
                      <SelectValue placeholder='Selectați unitatea' />
                    </SelectTrigger>
                    <SelectContent className='bg-white dark:bg-muted'>
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
                  UM în Ambalaj<span className='text-red-500'>*</span>
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
          {/* Items per Pallet - nr. ambalaje pe palet */}
          <FormField
            control={control}
            name='itemsPerPallet'
            render={({ field }) => (
              <FormItem className='w-1/5'>
                <FormLabel>
                  <InfoTooltip
                    content={
                      <>
                        <div className='mb-1'>
                          Adaugă numărul de ambalaje secundare (ex: saci, cutii)
                          care intră pe un palet.
                        </div>
                        <i className='text-muted-foreground'>
                          Dacă produsul nu se paletizează sau se vinde la bucată
                          pe palet, lasă 0.
                        </i>
                      </>
                    }
                  />
                  Ambalaje pe Palet
                </FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='1'
                    placeholder='ex: 48'
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
                            toast.error('Eroare la încărcare', {
                              description: error.message,
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
