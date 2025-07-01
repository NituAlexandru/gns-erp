'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/hooks/use-toast'
import { useEffect, useState } from 'react'
import { toSlug } from '@/lib/utils'
import { CategoryUpdateSchema } from '@/lib/db/modules/category/validator'
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
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import LoadingPage from '@/app/loading'

interface Props {
  categoryId: string
}

export default function EditCategoryView({ categoryId }: Props) {
  const router = useRouter()
  const [, setCategory] = useState<ICategoryDoc | null>(null)
  const [mainCategories, setMainCategories] = useState<ICategoryDoc[]>([])
  const [loading, setLoading] = useState(true)

  const form = useForm<ICategoryInput & { _id: string }>({
    resolver: zodResolver(CategoryUpdateSchema),
  })

  // Încarcă datele categoriei curente ȘI lista de categorii principale
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // Preluăm categoria de editat
        const categoryRes = await fetch(`/api/admin/categories/${categoryId}`)
        if (!categoryRes.ok) throw new Error('Categoria nu a fost găsită.')
        const categoryData: ICategoryDoc = await categoryRes.json()
        setCategory(categoryData)

        // Resetăm formularul cu datele primite
        form.reset({
          ...categoryData,
          mainCategory:
            typeof categoryData.mainCategory === 'object'
              ? categoryData.mainCategory._id
              : categoryData.mainCategory,
        })

        // Preluăm lista de posibili părinți
        const mainCategoriesRes = await fetch('/api/admin/categories/main')
        const mainCategoriesData = await mainCategoriesRes.json()
        setMainCategories(
          mainCategoriesData.filter((c: ICategoryDoc) => c._id !== categoryId)
        )
      } catch (err: unknown) {
        toast({ description: (err as Error).message })
        router.push('/admin/categories') 
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [categoryId, form, router])

  const {
    watch,
    setValue,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = form
  const watchedMainCategoryId = watch('mainCategory')

  // Efect pentru a actualiza slug-ul părintelui
  useEffect(() => {
    if (watchedMainCategoryId && watchedMainCategoryId !== '!') {
      const parent = mainCategories.find((c) => c._id === watchedMainCategoryId)
      if (parent) setValue('mainCategorySlug', toSlug(parent.name))
    } else {
      setValue('mainCategorySlug', '')
    }
  }, [watchedMainCategoryId, mainCategories, setValue])

  async function onSubmit(values: ICategoryInput & { _id: string }) {
    try {
      const response = await fetch(`/api/admin/categories/${values._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)

      toast({ description: 'Categoria a fost actualizată.' })
      router.push('/admin/categories')
      router.refresh()
    } catch (err: unknown) {
      toast({ description: (err as Error).message })
    }
  }

  if (loading) {
    return <LoadingPage />
  }
  return (
    <div className='p-6 space-y-6'>
      <div className='flex items-center gap-8 mb-20'>
        <Button asChild variant='outline'>
          <Link href='/admin/categories'>
            <ChevronLeft className='h-4 w-4' /> Inapoi
          </Link>
        </Button>
        <h1 className='text-2xl font-bold '>Editează Categoria</h1>
      </div>
      <div className='w-[90%] lg:w-1/2'>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Denumire categorie</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
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
                        <SelectValue placeholder='Selectează o categorie principală. Ex: Materiale de constructii' />
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
                    <Input {...field} readOnly />
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
              Actualizează Categorie
            </button>
          </form>
        </Form>
      </div>
    </div>
  )
}
