'use client'

import * as z from 'zod'
import { useState, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BudgetCategoryDTO } from '@/lib/db/modules/financial/treasury/budgeting/budget-category.types'
import {
  createBudgetCategory,
  updateBudgetCategory,
} from '@/lib/db/modules/financial/treasury/budgeting/budget-category.actions'
import {
  CreateBudgetCategorySchema,
  UpdateBudgetCategorySchema,
} from '@/lib/db/modules/financial/treasury/budgeting/budget-category.validator'

interface BudgetCategoryFormProps {
  allCategories: BudgetCategoryDTO[]
  currentCategory: BudgetCategoryDTO | null
  onFormSubmit: () => void
  defaultParentId?: string | null
}

type CreateValues = z.infer<typeof CreateBudgetCategorySchema>
type UpdateValues = z.infer<typeof UpdateBudgetCategorySchema>

export function BudgetCategoryForm({
  allCategories,
  currentCategory,
  onFormSubmit,
  defaultParentId = null, 
}: BudgetCategoryFormProps) {
  const isEditMode = !!currentCategory

  const [isMainCategory, setIsMainCategory] = useState(
    isEditMode ? !currentCategory.parentId : defaultParentId === null
  )

  const form = useForm<CreateValues | UpdateValues>({
    resolver: zodResolver(
      isEditMode ? UpdateBudgetCategorySchema : CreateBudgetCategorySchema
    ),
    defaultValues: isEditMode
      ? {
          _id: currentCategory._id,
          name: currentCategory.name,
          description: currentCategory.description || '',
          parentId: currentCategory.parentId,
        }
      : {
          name: '',
          description: '',
          parentId: defaultParentId, 
        },
  })

  useEffect(() => {
    const main = isEditMode
      ? !currentCategory.parentId
      : defaultParentId === null
    setIsMainCategory(main)

    form.reset(
      isEditMode
        ? {
            _id: currentCategory._id,
            name: currentCategory.name,
            description: currentCategory.description || '',
            parentId: currentCategory.parentId,
          }
        : {
            name: '',
            description: '',
            parentId: defaultParentId,
          }
    )
  }, [currentCategory, defaultParentId, isEditMode, form])

  const { isSubmitting } = form.formState
  const { control, setValue } = form

  useEffect(() => {
    if (isMainCategory) {
      setValue('parentId', null)
    } else {
      const firstValidParent = allCategories.find(
        (cat) => cat.parentId === null && cat._id !== currentCategory?._id
      )
      if (form.getValues('parentId') === null) {
        setValue('parentId', firstValidParent?._id || null)
      }
    }
  }, [isMainCategory, setValue, allCategories, currentCategory, form])

  async function onSubmit(data: CreateValues | UpdateValues) {
    try {
      let result

      if (isMainCategory) {
        data.parentId = null
      }

      if (isEditMode) {
        result = await updateBudgetCategory(data as UpdateValues)
      } else {
        result = await createBudgetCategory(data as CreateValues)
      }

      if (result.success) {
        toast.success(result.message)
        onFormSubmit()
      } else {
        toast.error('Eroare la salvare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
  }

  const parentOptions = allCategories.filter(
    (cat) =>
      cat.parentId === null &&
      cat._id !== currentCategory?._id &&
      cat.isActive === true
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nume Categorie</FormLabel>
              <FormControl>
                <Input placeholder='Ex: Cheltuieli Marketing' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem className='flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm'>
          <FormControl>
            <Checkbox
              checked={isMainCategory}
              onCheckedChange={(checked) =>
                setIsMainCategory(checked as boolean)
              }
            
              disabled={isEditMode && currentCategory?.parentId !== null}
            />
          </FormControl>
          <div className='space-y-1 leading-none'>
            <FormLabel>Este categorie principală?</FormLabel>
            <FormDescription>
              Bifează dacă această categorie nu are un părinte.
            </FormDescription>
          </div>
        </FormItem>

        {!isMainCategory && (
          <FormField
            control={control}
            name='parentId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subcategorie a</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''}
          
                  disabled={isEditMode && currentCategory?.parentId !== null}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează o categorie părinte...' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parentOptions.length === 0 ? (
                      <div className='text-center text-sm text-muted-foreground p-2'>
                        Nu există părinți disponibili.
                      </div>
                    ) : (
                      parentOptions.map((cat) => (
                        <SelectItem key={cat._id} value={cat._id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descriere (Opțional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Observații...'
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type='submit' disabled={isSubmitting} className='w-full'>
          {isSubmitting ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : null}
          {isEditMode ? 'Salvează Modificările' : 'Creează Categorie'}
        </Button>
      </form>
    </Form>
  )
}
