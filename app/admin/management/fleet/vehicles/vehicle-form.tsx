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
  IVehicleDoc,
  IVehicleInput,
} from '@/lib/db/modules/fleet/vehicle/types'
import {
  VehicleCreateSchema,
  VehicleUpdateSchema,
} from '@/lib/db/modules/fleet/vehicle/validator'
import {
  VEHICLE_TEMPLATES,
  VEHICLE_TYPE_NAMES,
} from '@/lib/db/modules/fleet/vehicle/constants'

interface Props {
  initialValues?: IVehicleDoc
}

export default function VehicleForm({ initialValues }: Props) {
  const router = useRouter()
  const isEditMode = !!initialValues

  const form = useForm<IVehicleInput>({
    resolver: zodResolver(
      isEditMode ? VehicleUpdateSchema : VehicleCreateSchema
    ),
    defaultValues: initialValues
      ? {
          ...initialValues,
          // Asigurăm valori de fallback pentru câmpurile care ar putea fi null/undefined
          name: initialValues.name || '',
          carNumber: initialValues.carNumber || '',
          carType: initialValues.carType || '',
          brand: initialValues.brand || '',
          model: initialValues.model || '',
          year: initialValues.year || new Date().getFullYear(),
          chassisNumber: initialValues.chassisNumber || '',
          maxLoadKg: initialValues.maxLoadKg || 0,
          maxVolumeM3: initialValues.maxVolumeM3 || 0,
          lengthCm: initialValues.lengthCm || 0,
          widthCm: initialValues.widthCm || 0,
          heightCm: initialValues.heightCm || 0,
          ratePerKm: initialValues.ratePerKm || 0,
          averageConsumption: initialValues.averageConsumption || 0,
          notes: initialValues.notes || '',
        }
      : {
          name: '',
          carNumber: '',
          carType: '',
          brand: '',
          model: '',
          year: new Date().getFullYear(),
          chassisNumber: '',
          maxLoadKg: 0,
          maxVolumeM3: 0,
          lengthCm: 0,
          widthCm: 0,
          heightCm: 0,
          ratePerKm: 0,
          averageConsumption: 0,
          notes: '',
        },
  })

  const handleTypeChange = (typeName: string) => {
    const template = VEHICLE_TEMPLATES.find((t) => t.name === typeName)
    if (template) {
      form.setValue('maxLoadKg', template.maxLoadKg)
      form.setValue('maxVolumeM3', template.maxVolumeM3)
      form.setValue('lengthCm', template.lengthCm)
      form.setValue('widthCm', template.widthCm)
      form.setValue('heightCm', template.heightCm)
      form.setValue('ratePerKm', template.ratePerKm)
      toast.info('Specificațiile standard au fost auto-completate.')
    }
  }

  const onSubmit = async (values: IVehicleInput) => {
    try {
      let response
      if (isEditMode) {
        // Acțiune de actualizare (PUT)
        response = await fetch(
          `/api/admin/management/fleet/vehicles/${initialValues?._id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          }
        )
      } else {
        // Acțiune de creare (POST)
        response = await fetch('/api/admin/management/fleet/vehicles', {
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
      router.push('/admin/management/fleet/vehicles')
      router.refresh()
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('duplicate key')) {
          toast.error('Un vehicul cu acest număr de înmatriculare există deja.')
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('A apărut o eroare necunoscută.')
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
                <FormLabel>Nume / Denumire Vehicul</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: Camion DAF #1' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='carNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nr. Înmatriculare</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: B 123 ABC' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='carType'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tip Vehicul (Șablon)</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value)
                    handleTypeChange(value)
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează un tip' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VEHICLE_TYPE_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
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
            name='brand'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marcă</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: DAF' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='model'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder='Ex: XF 450' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='year'
            render={({ field }) => (
              <FormItem>
                <FormLabel>An Fabricație</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='Ex: 2020'
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className='text-lg font-semibold border-t pt-4'>
          Specificații Spațiu de Marfă
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
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className='text-lg font-semibold border-t pt-4'>
          Detalii Operaționale
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='ratePerKm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tarif pe km (LEI)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='averageConsumption'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consum Mediu (L/100km)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>

        <div className='flex justify-end pt-4'>
          <Button type='submit' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            {isEditMode ? 'Salvează Modificările' : 'Adaugă Vehicul'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
