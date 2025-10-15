'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ServiceInputSchema } from '@/lib/db/modules/setting/services/validator'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEffect } from 'react'
import {
  ServiceDTO,
  ServiceInput,
} from '@/lib/db/modules/setting/services/types'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ServiceFormProps {
  vatRates: VatRateDTO[]
  onSave: (data: ServiceInput, serviceId?: string) => void
  isSaving: boolean
  onClose: () => void
  initialData?: ServiceDTO | null
}

export function ServiceForm({
  vatRates,
  onSave,
  isSaving,
  onClose,
  initialData,
}: ServiceFormProps) {
  const form = useForm<ServiceInput>({
    resolver: zodResolver(ServiceInputSchema),
    // Am actualizat valorile implicite pentru noile câmpuri
    defaultValues: initialData
      ? { ...initialData, vatRate: initialData.vatRate._id }
      : {
          name: '',
          code: '',
          description: '',
          price: 0,
          cost: 0,
          category: 'Serviciu',
          isPerDelivery: false,
          unitOfMeasure: 'bucata',
          vatRate: vatRates.find((v) => v.isDefault)?._id || vatRates[0]?._id,
          isActive: true,
        },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({ ...initialData, vatRate: initialData.vatRate._id })
    }
  }, [initialData, form])

  const handleSubmit = (data: ServiceInput) => {
    onSave(data, initialData?._id)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
        {/* Numele și Codul */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nume Serviciu</FormLabel>
                <FormControl>
                  <Input placeholder='ex: Descărcare mecanizată' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='code'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cod Serviciu</FormLabel>
                <FormControl>
                  <Input placeholder='ex: SERV-DESC' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* --- CATEGORIE, COST, PREȚ --- */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <FormField
            control={form.control}
            name='category'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categorie</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează categoria...' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='Serviciu'>Serviciu</SelectItem>
                    <SelectItem value='Autorizatie'>Autorizație</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='cost'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost (fără TVA)</FormLabel>
                <FormControl>
                  <Input type='number' step='0.01' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='price'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preț Vânzare (fără TVA)</FormLabel>
                <FormControl>
                  <Input type='number' step='0.01' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* --- TVA ȘI OPȚIUNI --- */}
        <div className='flex flex-row items-center justify-between pt-2'>
          <FormField
            control={form.control}
            name='vatRate'
            render={({ field }) => (
              <FormItem className='w-[200px]'>
                <FormLabel>Cotă TVA</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Selectează...' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vatRates.map((rate) => (
                      <SelectItem key={rate._id} value={rate._id}>
                        {rate.name} ({rate.rate}%)
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
            name='isPerDelivery'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center gap-2 pt-6'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FormLabel className='!mt-0 font-normal cursor-help'>
                        Aplicabil la fiecare livrare
                      </FormLabel>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className='max-w-md'>
                        Bifând această opțiune, serviciul va fi tratat ca un
                        cost recurent.
                        <br />
                        La crearea fiecărei livrări dintr-o comandă, acest
                        serviciu va fi propus automat pentru a fi adăugat pe
                        aviz.
                        <br />
                        <br />
                        <b>Exemplu:</b> Dacă Transport este bifat, iar o comandă
                        are 3 livrări, veți putea adăuga costul de transport pe
                        fiecare din cele 3 avize.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='isActive'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center gap-2 pt-6'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className='!mt-0 font-normal'>Activ</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className='flex justify-end gap-2 pt-4'>
          <Button type='button' variant='ghost' onClick={onClose}>
            Anulează
          </Button>
          <Button type='submit' disabled={isSaving}>
            {isSaving ? 'Se salvează...' : 'Salvează'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
