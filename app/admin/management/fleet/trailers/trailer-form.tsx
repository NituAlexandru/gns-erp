'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import {
  ITrailerDoc,
  ITrailerInput,
} from '@/lib/db/modules/fleet/trailers/types'
import {
  TrailerCreateSchema,
  TrailerUpdateSchema,
  TRAILER_TYPES,
} from '@/lib/db/modules/fleet/trailers/validator'
import { useEffect } from 'react'

interface Props {
  initialValues?: ITrailerDoc
}

export default function TrailerForm({ initialValues }: Props) {
  const router = useRouter()
  const isEditMode = !!initialValues

  const form = useForm<ITrailerInput>({
    resolver: zodResolver(
      isEditMode ? TrailerUpdateSchema : TrailerCreateSchema
    ),
    defaultValues: initialValues || {
      name: '',
      licensePlate: '',
      type: 'Prelată',
      maxLoadKg: 0,
      maxVolumeM3: 0,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
      year: new Date().getFullYear(),
      notes: '',
    },
  })

  const { watch, setValue } = form

  const [lengthCm, widthCm, heightCm] = watch([
    'lengthCm',
    'widthCm',
    'heightCm',
  ])
  useEffect(() => {
    if (lengthCm > 0 && widthCm > 0 && heightCm > 0) {
      const volumeM3 = (lengthCm / 100) * (widthCm / 100) * (heightCm / 100)
      setValue('maxVolumeM3', parseFloat(volumeM3.toFixed(2)), {
        shouldValidate: true,
      })
    }
  }, [lengthCm, widthCm, heightCm, setValue])

  const onSubmit = async (values: ITrailerInput) => {
    try {
      let response
      if (isEditMode) {
        response = await fetch(
          `/api/admin/management/fleet/trailers/${initialValues._id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          }
        )
      } else {
        response = await fetch('/api/admin/management/fleet/trailers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      }

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message)
      }

      toast.success(result.message)
      router.push('/admin/management/fleet/trailers')
      router.refresh()
    } catch (err) {
      if (err instanceof Error && err.message.includes('duplicate key')) {
        toast.error('O remorcă cu acest număr de înmatriculare există deja.')
      } else {
        toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nume / Denumire</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: Remorca Schmitz #1' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='licensePlate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nr. Înmatriculare</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: B 456 XYZ' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='type'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tip Remorcă</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRAILER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className='text-lg font-semibold border-t pt-4'>
          Specificații Marfă
        </h3>
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
          <FormField
            control={form.control}
            name='maxLoadKg'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sarcina Utilă (kg)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='maxVolumeM3'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Volum Util (m³)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    disabled
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='lengthCm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lungime Utilă (cm)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='widthCm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lățime Utilă (cm)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='heightCm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Înălțime Utilă (cm)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className='text-lg font-semibold border-t pt-4'>Alte Detalii</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='year'
            render={({ field }) => (
              <FormItem>
                <FormLabel>An Fabricație</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name='notes'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notițe / Mențiuni</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end pt-4'>
          <Button type='submit' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {isEditMode ? 'Salvează Modificările' : 'Adaugă Remorcă'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
