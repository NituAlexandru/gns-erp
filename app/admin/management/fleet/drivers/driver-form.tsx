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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { IDriverDoc, IDriverInput } from '@/lib/db/modules/fleet/drivers/types'
import {
  DriverCreateSchema,
  DriverUpdateSchema,
  DRIVING_LICENSE_CATEGORIES,
  CERTIFICATION_TYPES,
  DRIVER_STATUSES,
} from '@/lib/db/modules/fleet/drivers/validator'

interface Props {
  initialValues?: IDriverDoc
}

export default function DriverForm({ initialValues }: Props) {
  const router = useRouter()
  const isEditMode = !!initialValues

  const form = useForm<IDriverInput>({
    resolver: zodResolver(isEditMode ? DriverUpdateSchema : DriverCreateSchema),
    defaultValues: initialValues || {
      name: '',
      phone: '',
      email: '',
      status: 'Activ',
      drivingLicenses: [],
      certifications: [],
      notes: '',
    },
  })

  const onSubmit = async (values: IDriverInput) => {
    try {
      let response
      if (isEditMode) {
        response = await fetch(
          `/api/admin/management/fleet/drivers/${initialValues._id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          }
        )
      } else {
        response = await fetch('/api/admin/management/fleet/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      }

      const result = await response.json()
      if (!response.ok) throw new Error(result.message)

      toast.success(result.message)
      router.push('/admin/management/fleet/drivers')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'A apărut o eroare.')
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
                <FormLabel>Nume Complet</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: Popescu Ion' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='phone'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefon</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: 0722123456' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Opțional)</FormLabel>
                <FormControl>
                  <Input
                    type='email'
                    placeholder='Ex: sofer@email.com'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <FormField
            control={form.control}
            name='employmentDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Angajării</FormLabel>
                <FormControl>
                  <Input
                    type='date'
                    {...field}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split('T')[0]
                        : ''
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='status'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DRIVER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormItem className='p-4 border rounded-lg'>
          <FormLabel className='text-base'>Categorii Permis</FormLabel>
          <div className='grid grid-cols-3 md:grid-cols-6 gap-4 pt-2'>
            {DRIVING_LICENSE_CATEGORIES.map((item) => (
              <FormField
                key={item}
                control={form.control}
                name='drivingLicenses'
                render={({ field }) => (
                  <FormItem className='flex items-center space-x-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(item)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...(field.value || []), item])
                            : field.onChange(
                                field.value?.filter((value) => value !== item)
                              )
                        }}
                      />
                    </FormControl>
                    <FormLabel className='font-normal'>{item}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>

        <FormItem className='p-4 border rounded-lg'>
          <FormLabel className='text-base'>Atestate și Certificări</FormLabel>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 pt-2'>
            {CERTIFICATION_TYPES.map((item) => (
              <FormField
                key={item}
                control={form.control}
                name='certifications'
                render={({ field }) => (
                  <FormItem className='flex items-center space-x-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(item)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...(field.value || []), item])
                            : field.onChange(
                                field.value?.filter((value) => value !== item)
                              )
                        }}
                      />
                    </FormControl>
                    <FormLabel className='font-normal'>{item}</FormLabel>
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>

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
            {isEditMode ? 'Salvează Modificările' : 'Adaugă Șofer'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
