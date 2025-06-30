'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { ISettingInput } from '@/lib/db/modules/setting'
import { TrashIcon } from 'lucide-react'
import React, { useEffect } from 'react'
import { useFieldArray, UseFormReturn } from 'react-hook-form'

export default function DeliveryDateForm({
  form,
  id,
}: {
  form: UseFormReturn<ISettingInput>
  id: string
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'availableDeliveryDates',
  })
  const {
    watch,
    setValue,
    control,
    formState: { errors },
  } = form

  // fallback pentru a evita filter pe undefined
  const availableDeliveryDates = watch('availableDeliveryDates') ?? []
  const defaultDeliveryDate = watch('defaultDeliveryDate') ?? ''

  useEffect(() => {
    const validNames = availableDeliveryDates.map((d) => d.name)
    if (!validNames.includes(defaultDeliveryDate)) {
      setValue('defaultDeliveryDate', '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(availableDeliveryDates), defaultDeliveryDate, setValue])

  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>Delivery Dates</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-4'>
          {fields.map((field, index) => (
            <div key={field.id} className='flex gap-2'>
              {/* Name */}
              <FormField
                control={form.control}
                name={`availableDeliveryDates.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 && <FormLabel>Name</FormLabel>}
                    <FormControl>
                      <Input {...field} placeholder='Name' />
                    </FormControl>
                    <FormMessage>
                      {errors.availableDeliveryDates?.[index]?.name?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
              {/* Days */}
              <FormField
                control={form.control}
                name={`availableDeliveryDates.${index}.daysToDeliver`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 && <FormLabel>Days</FormLabel>}
                    <FormControl>
                      <Input
                        type='number'
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.currentTarget.value

                          field.onChange(val === '' ? 0 : Number(val))
                        }}
                        placeholder='Days to deliver'
                      />
                    </FormControl>
                    <FormMessage>
                      {
                        errors.availableDeliveryDates?.[index]?.daysToDeliver
                          ?.message
                      }
                    </FormMessage>
                  </FormItem>
                )}
              />
              {/* Shipping Price */}
              <FormField
                control={form.control}
                name={`availableDeliveryDates.${index}.shippingPrice`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 && <FormLabel>Shipping Price</FormLabel>}
                    <FormControl>
                      <Input {...field} placeholder='Shipping Price' />
                    </FormControl>
                    <FormMessage>
                      {
                        errors.availableDeliveryDates?.[index]?.shippingPrice
                          ?.message
                      }
                    </FormMessage>
                  </FormItem>
                )}
              />
              {/* Free Shipping Min Price */}
              <FormField
                control={form.control}
                name={`availableDeliveryDates.${index}.freeShippingMinPrice`}
                render={({ field }) => (
                  <FormItem>
                    {index === 0 && <FormLabel>Free Shipping Min</FormLabel>}
                    <FormControl>
                      <Input {...field} placeholder='Free Shipping Min' />
                    </FormControl>
                    <FormMessage>
                      {
                        errors.availableDeliveryDates?.[index]
                          ?.freeShippingMinPrice?.message
                      }
                    </FormMessage>
                  </FormItem>
                )}
              />
              {/* Remove */}
              <div>
                {index === 0 && <div>Action</div>}
                <Button
                  type='button'
                  variant='outline'
                  disabled={fields.length === 1}
                  className={index === 0 ? 'mt-2' : ''}
                  onClick={() => remove(index)}
                >
                  <TrashIcon className='w-4 h-4' />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            onClick={() =>
              append({
                name: '',
                daysToDeliver: 0,
                shippingPrice: 0,
                freeShippingMinPrice: 0,
              })
            }
          >
            Add Delivery Date
          </Button>
        </div>

        {/* Default selector */}
        <FormField
          control={control}
          name='defaultDeliveryDate'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Delivery Date</FormLabel>
              <FormControl>
                <Select
                  value={field.value || ''}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select a delivery date' />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDeliveryDates
                      .filter((d) => d.name)
                      .map((d, i) => (
                        <SelectItem key={i} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage>{errors.defaultDeliveryDate?.message}</FormMessage>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
