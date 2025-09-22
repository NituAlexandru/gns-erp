'use client'

import { useRouter } from 'next/navigation'
import { useForm, SubmitHandler } from 'react-hook-form'
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
  IAssignmentDoc,
  IAssignmentInput,
} from '@/lib/db/modules/fleet/assignments/types'
import {
  AssignmentCreateSchema,
  AssignmentUpdateSchema,
  ASSIGNMENT_STATUSES,
} from '@/lib/db/modules/fleet/assignments/validator'
import { IDriverDoc } from '@/lib/db/modules/fleet/drivers/types'
import { IVehicleDoc } from '@/lib/db/modules/fleet/vehicle/types'
import { ITrailerDoc } from '@/lib/db/modules/fleet/trailers/types'

interface Props {
  initialValues?: IAssignmentDoc
  driversList: IDriverDoc[]
  vehiclesList: IVehicleDoc[]
  trailersList: ITrailerDoc[]
}

type FormValues = IAssignmentInput & { _id?: string }

export default function AssignmentsForm({
  initialValues,
  driversList,
  vehiclesList,
  trailersList,
}: Props) {
  const router = useRouter()
  const isEditMode = !!initialValues

  const form = useForm<FormValues>({
    resolver: zodResolver(
      isEditMode ? AssignmentUpdateSchema : AssignmentCreateSchema
    ),
    defaultValues: initialValues
      ? {
          _id: initialValues._id, 
          name: initialValues.name,
          driverId:
            typeof initialValues.driverId === 'object'
              ? initialValues.driverId._id
              : initialValues.driverId,
          vehicleId:
            typeof initialValues.vehicleId === 'object'
              ? initialValues.vehicleId._id
              : initialValues.vehicleId,
          trailerId:
            typeof initialValues.trailerId === 'object' &&
            initialValues.trailerId !== null
              ? initialValues.trailerId._id
              : initialValues.trailerId,
          status: initialValues.status,
          notes: initialValues.notes ?? '',
        }
      : {
          name: '',
          driverId: '',
          vehicleId: '',
          trailerId: '',
          status: 'Activ',
          notes: '',
        },
  })

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      let response
      if (isEditMode) {
        response = await fetch(
          `/api/admin/management/fleet/assignments/${values._id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          }
        )
      } else {
        response = await fetch('/api/admin/management/fleet/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      }

      const result = await response.json()
      if (!response.ok) throw new Error(result.message)

      toast.success(result.message)
      router.push('/admin/management/fleet/assignments')
      router.refresh()
    } catch (err) {
      if (err instanceof Error && err.message.includes('duplicate key')) {
        toast.error('Un ansamblu cu acest nume există deja.')
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
                <FormLabel>Nume Ansamblu</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: Echipaj DAF #1' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='driverId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Șofer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează un șofer' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {driversList.map((driver) => (
                      <SelectItem key={driver._id} value={driver._id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='vehicleId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicul</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează un vehicul' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehiclesList.map((vehicle) => (
                      <SelectItem key={vehicle._id} value={vehicle._id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <FormField
            control={form.control}
            name='trailerId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remorcă (Opțional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Fără remorcă' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {trailersList.map((trailer) => (
                      <SelectItem key={trailer._id} value={trailer._id}>
                        {trailer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {ASSIGNMENT_STATUSES.map((s) => (
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
            {isEditMode ? 'Salvează Modificările' : 'Adaugă Ansamblu'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
