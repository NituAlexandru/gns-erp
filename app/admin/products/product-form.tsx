'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { createProduct, updateProduct } from '@/lib/actions/product.actions'
import { IProduct } from '@/lib/db/models/product.model'
import { UploadButton } from '@/lib/uploadthing'
import { ProductInputSchema, ProductUpdateSchema } from '@/lib/validator'
import { Checkbox } from '@/components/ui/checkbox'
import { toSlug } from '@/lib/utils'
import { IProductInput } from '@/types'
import { Trash } from 'lucide-react'
import {
  AVAILABLE_PALLET_TYPES,
  AVAILABLE_TAGS,
  NO_PALLET,
  UNITS,
} from '@/lib/constants'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

const productDefaultValues: IProductInput =
  process.env.NODE_ENV === 'development'
    ? {
        name: 'Sample Product',
        slug: 'sample-product',
        category: 'Sample Category',
        images: ['/images/p11-1.jpg'],
        brand: 'Sample Brand',
        description: 'This is a sample description of the product.',
        price: 99.99,
        listPrice: 0,
        entryPrice: 0,
        countInStock: 15,
        numReviews: 0,
        avgRating: 0,
        numSales: 0,
        isPublished: false,
        tags: [],
        sizes: [],
        colors: [],
        ratingDistribution: [],
        reviews: [],
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
        palletTypeId: undefined,
      }
    : {
        name: '',
        slug: '',
        category: '',
        images: [],
        brand: '',
        description: '',
        price: 0,
        entryPrice: 0,
        listPrice: 0,
        countInStock: 0,
        numReviews: 0,
        avgRating: 0,
        numSales: 0,
        isPublished: false,
        tags: [],
        sizes: [],
        colors: [],
        ratingDistribution: [],
        reviews: [],
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
        palletTypeId: undefined,
      }

const ProductForm = ({
  type,
  product,
  productId,
}: {
  type: 'Create' | 'Update'
  product?: IProduct
  productId?: string
}) => {
  const router = useRouter()

  const form = useForm<IProductInput>({
    resolver:
      type === 'Update'
        ? zodResolver(ProductUpdateSchema)
        : zodResolver(ProductInputSchema),
    defaultValues:
      product && type === 'Update'
        ? {
            ...productDefaultValues,
            ...product,
            palletTypeId: product.palletTypeId ?? NO_PALLET,
          }
        : {
            ...productDefaultValues,
            palletTypeId: NO_PALLET,
          },
  })

  const { watch, setValue, control } = form
  const [colorInput, setColorInput] = useState('')
  const [sizeInput, setSizeInput] = useState('')

  const [length, width, height] = watch(['length', 'width', 'height'])

  // recalc volume whenever length/width/height change
  useEffect(() => {
    if (length > 0 && width > 0 && height > 0) {
      const vol = parseFloat(
        ((length / 100) * (width / 100) * (height / 100)).toFixed(3)
      )
      setValue('volume', vol, { shouldValidate: true })
    }
  }, [length, width, height, setValue])

  const { toast } = useToast()

  async function onSubmit(values: IProductInput) {
    const payload: IProductInput = {
      ...values,
    }

    if (type === 'Create') {
      const res = await createProduct(payload)
      if (!res.success) {
        toast({ description: res.message })
      } else {
        toast({ description: res.message })
        router.push(`/admin/products`)
      }
    }

    if (type === 'Update') {
      if (!productId) return router.push(`/admin/products`)
      const res = await updateProduct({ ...payload, _id: productId })
      if (!res.success) {
        toast({ description: res.message })
      } else {
        router.push(`/admin/products`)
      }
    }
  }

  const images = form.watch('images')

  return (
    <Form {...form}>
      <form
        method='post'
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-8'
      >
        {/* code, name and slug */}
        <div className='flex flex-col gap-5 md:flex-row'>
          {/* Cod produs */}
          <FormField
            control={form.control}
            name='productCode'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Cod Produs</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Introduceți codul produsului'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />{' '}
          <FormField
            control={form.control}
            name='brand'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Producator</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Introduceți producatorul produsului'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Nume Produs</FormLabel>
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
            name='slug'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <div className='relative'>
                    <Input
                      placeholder='Introduceți slug-ul produsului'
                      className='pl-8'
                      {...field}
                    />
                    <button
                      type='button'
                      onClick={() => {
                        form.setValue('slug', toSlug(form.getValues('name')))
                      }}
                      className='absolute right-1 top-1 bg-green-600 rounded-sm p-0.5'
                    >
                      Generează
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>{' '}
        {/* Category, Brand, Unit */}
        <div className='flex flex-col gap-5 md:flex-row'>
          <FormField
            control={form.control}
            name='mainCategory'
            render={({ field }) => (
              <FormItem className='w-1/4'>
                <FormLabel>Categorie Generala</FormLabel>
                <FormControl>
                  <Input placeholder='Introduceți categoria' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='category'
            render={({ field }) => (
              <FormItem className='w-1/4'>
                <FormLabel>Subcategorie</FormLabel>
                <FormControl>
                  <Input placeholder='Introduceți subcategoria' {...field} />
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
              <FormItem className='w-1/6'>
                <FormLabel>Unitate Măsură</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
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
          />{' '}
          {/* Packaging Quantity */}
          <FormField
            control={control}
            name='packagingQuantity'
            render={({ field }) => (
              <FormItem className='w-1/12'>
                <FormLabel>Ambalaj / Qty</FormLabel>
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
          {/* Packaging Unit */}
          <FormField
            control={control}
            name='packagingUnit'
            render={({ field }) => (
              <FormItem className='w-1/6'>
                <FormLabel>Unitate Ambalare</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
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
        </div>
        {/* Price & Stock */}
        <div className='flex flex-col gap-5 md:flex-row'>
          <FormField
            control={form.control}
            name='entryPrice'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Preț Intrare (RON)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    placeholder='Introduceți prețul de intrare'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='listPrice'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Preț Listă (RON)</FormLabel>
                <FormControl>
                  <Input placeholder='Introduceți prețul de listă' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='price'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Preț Vânzare Brut (RON)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='Introduceți prețul de vânzare'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='countInStock'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Cantitate în Stoc</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='Introduceți cantitatea din stoc'
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
                    {d.charAt(0).toUpperCase() + d.slice(1)} (cm)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder={`${d} in cm`}
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
                <FormLabel>Volum (m³)</FormLabel>
                <FormControl>
                  <Input {...field} readOnly />
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
                <FormLabel>Greutate (kg)</FormLabel>
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
        {/* Colors, Sizes */}
        <div className='flex flex-col gap-5 md:flex-row min-h-28'>
          <FormField
            control={control}
            name='colors'
            render={({ field }) => {
              const items = field.value || []
              return (
                <FormItem>
                  <FormLabel>Culori</FormLabel>
                  <FormControl>
                    <div>
                      {' '}
                      <div className='mt-2 flex space-x-2'>
                        <Input
                          placeholder='Culoare nouă'
                          value={colorInput}
                          onChange={(e) => setColorInput(e.target.value)}
                        />
                        <Button
                          type='button'
                          onClick={() => {
                            if (!colorInput) return
                            field.onChange([...items, colorInput])
                            setColorInput('')
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {items.map((c, i) => (
                          <div key={i} className='flex items-center space-x-1'>
                            <span className='px-2 py-1 bg-gray-200 rounded'>
                              {c}
                            </span>
                            <Button
                              type='button'
                              size='icon'
                              variant='ghost'
                              onClick={() =>
                                field.onChange(items.filter((_, j) => j !== i))
                              }
                            >
                              <Trash size={12} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          {/* Sizes */}
          <FormField
            control={control}
            name='sizes'
            render={({ field }) => {
              const items = field.value || []
              return (
                <FormItem>
                  <FormLabel>Mărime </FormLabel>
                  <FormControl>
                    <div>
                      {' '}
                      <div className='mt-2 flex space-x-2'>
                        <Input
                          placeholder='Mărime nouă'
                          value={sizeInput}
                          onChange={(e) => setSizeInput(e.target.value)}
                        />
                        <Button
                          type='button'
                          onClick={() => {
                            if (!sizeInput) return
                            field.onChange([...items, sizeInput])
                            setSizeInput('')
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {items.map((s, i) => (
                          <div key={i} className='flex items-center space-x-1'>
                            <span className='px-2 py-1 bg-gray-200 rounded'>
                              {s}
                            </span>
                            <Button
                              type='button'
                              size='icon'
                              variant='ghost'
                              onClick={() =>
                                field.onChange(items.filter((_, j) => j !== i))
                              }
                            >
                              <Trash size={12} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
          {/* –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– */}
          {/* Items per Pallet & Pallet Type */}
          <div className='flex flex-col gap-5 md:flex-row'>
            {/* itemsPerPallet */}
            <FormField
              control={form.control}
              name='itemsPerPallet'
              render={({ field }) => (
                <FormItem className='w-1/4'>
                  <FormLabel>Articole / Palet</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      {...field}
                      placeholder='Ex: 80'
                    />
                  </FormControl>
                  <FormDescription>
                    Câte produse încap pe un palet (trebuie să fie minim 1)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* palletTypeId */}
            <FormField
              control={form.control}
              name='palletTypeId'
              render={({ field }) => (
                <FormItem className='w-1/4'>
                  <FormLabel>Tip Palet</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder='Alege un tip...' />
                      </SelectTrigger>
                      <SelectContent>
                        {/* sentinel pentru “Niciun palet” */}
                        <SelectItem value={NO_PALLET}>Niciun palet</SelectItem>
                        {AVAILABLE_PALLET_TYPES.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Dacă produsul se livrează pe palet, alege tipul de palet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* –––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––– */}
        </div>
        {/* Tags */}
        <FormField
          control={form.control}
          name='tags'
          render={({ field }) => {
            const selectedTags = field.value || []
            return (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <div className='flex flex-row gap-4 overflow-x-auto'>
                    {AVAILABLE_TAGS.map((tag) => {
                      const checked = selectedTags.includes(tag)
                      return (
                        <label
                          key={tag}
                          className='flex items-center space-x-2 whitespace-nowrap'
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              if (isChecked) {
                                field.onChange([...selectedTags, tag])
                              } else {
                                field.onChange(
                                  selectedTags.filter((t) => t !== tag)
                                )
                              }
                            }}
                          />
                          <span className='capitalize'>
                            {tag.replace('-', ' ')}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </FormControl>

                <FormMessage />
              </FormItem>
            )
          }}
        />
        {/* Images */}
        <div className='flex flex-col gap-5 md:flex-row'>
          <FormField
            control={form.control}
            name='images'
            render={() => (
              <FormItem className='w-full'>
                <FormLabel>Imagine</FormLabel>
                <Card>
                  <CardContent className='space-y-2 mt-2 min-h-48'>
                    <div className='flex justify-start items-center space-x-2'>
                      {images.map((image: string) => (
                        <Card key={image} className='relative '>
                          <Image
                            src={image}
                            alt='imagine produs'
                            className='w-36 h-36 object-cover object-center rounded-sm'
                            width={100}
                            height={100}
                          />
                          <Button
                            variant={'destructive'}
                            className='absolute top-1 right-1'
                            type='button'
                            size='icon'
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
                          onClientUploadComplete={(res: { url: string }[]) => {
                            form.setValue('images', [...images, res[0].url])
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
          />
        </div>
        {/* Description */}
        <div>
          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem className='w-full'>
                <FormLabel>Descriere</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Introduceți o descriere detaliată a produsului...'
                    className='resize-none min-h-48'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Puteți <span>@menționa</span> alți utilizatori și organizații.
                </FormDescription>
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
                    placeholder='Una pe rând (Ex: Material: Bumbac)'
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
        {/* Is Published */}
        <div>
          <FormField
            control={form.control}
            name='isPublished'
            render={({ field }) => (
              <FormItem className='space-x-2 items-center'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Publicat?</FormLabel>
              </FormItem>
            )}
          />
        </div>
        <div>
          <Button
            type='submit'
            size='lg'
            disabled={form.formState.isSubmitting}
            className='button col-span-2 w-full'
          >
            {form.formState.isSubmitting ? 'Se trimite...' : `${type} Product `}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default ProductForm
