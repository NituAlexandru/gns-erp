'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/hooks/use-toast'
import { useEffect, useState } from 'react'
import { toSlug } from '@/lib/utils'
import { CategoryInputSchema } from '@/lib/db/modules/category/validator'
import type { ICategoryInput, ICategoryDoc } from '@/lib/db/modules/category'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CategoryForm() {
  const router = useRouter()
  const [mainCategories, setMainCategories] = useState<ICategoryDoc[]>([])

  useEffect(() => {
    async function fetchMainCategories() {
      const response = await fetch('/api/admin/categories/main')
      const data = await response.json()
      setMainCategories(data)
    }
    fetchMainCategories()
  }, [])

  const form = useForm<ICategoryInput>({
    resolver: zodResolver(CategoryInputSchema),
    defaultValues: {
      name: '',
      slug: '',
      mainCategory: undefined,
      mainCategorySlug: '',
    },
  })

  const {
    watch,
    setValue,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = form
  const watchedName = watch('name')
  const watchedMainCategoryId = watch('mainCategory')

  useEffect(() => {
    setValue('slug', toSlug(watchedName))
  }, [watchedName, setValue])

  useEffect(() => {
    if (watchedMainCategoryId && watchedMainCategoryId !== '!') {
      const parentCategory = mainCategories.find(
        (cat) => cat._id === watchedMainCategoryId
      )
      if (parentCategory) {
        setValue('mainCategorySlug', toSlug(parentCategory.name))
      }
    } else {
      setValue('mainCategorySlug', '')
    }
  }, [watchedMainCategoryId, mainCategories, setValue])

  async function onSubmit(values: ICategoryInput) {
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)

      toast({ description: 'Categoria a fost creată.' })
      router.push('/admin/categories')
      router.refresh()
    } catch (err: unknown) {
      toast({ description: (err as Error).message })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Denumire categorie</FormLabel>
              <FormControl>
                <Input
                  placeholder='Ex: Caramida, BCA, Otel beton '
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name='slug'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug (Identificator URL)</FormLabel>
              <FormControl>
                <Input
                  placeholder='Se generează automat din denumire'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name='mainCategory'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria principală</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className='w-full cursor-pointer'>
                    <SelectValue placeholder='Selectează o categorie principală. Ex: Materiale de constructii ' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='!'>Niciuna</SelectItem>
                  {mainCategories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name='mainCategorySlug'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Slug categorie principală (Identificator URL)
              </FormLabel>
              <FormControl>
                <Input
                  placeholder='Se generează automat din denumire'
                  {...field}
                  readOnly
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <button
          type='submit'
          disabled={isSubmitting}
          className='px-4 py-2 bg-primary text-white rounded-md cursor-pointer'
        >
          Adaugă Categorie
        </button>
      </form>
    </Form>
  )
}
