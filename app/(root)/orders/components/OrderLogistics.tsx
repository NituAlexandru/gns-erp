'use client'

import { useFormContext, Controller, useWatch } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ShippingRateDTO } from '@/lib/db/modules/setting/shipping-rates/types'
import { DELIVERY_METHODS } from '@/lib/db/modules/order/constants'
import { IAddress } from '@/lib/db/modules/client/types'
import { formatCurrency } from '@/lib/utils'

export function OrderLogistics({
  shippingRates,
}: {
  shippingRates: ShippingRateDTO[]
}) {
  const { control } = useFormContext()
  const deliveryMethodKey = useWatch({ control, name: 'deliveryType' })

  const selectedMethodInfo = DELIVERY_METHODS.find(
    (m) => m.key === deliveryMethodKey
  )
  const showVehicleSelector = selectedMethodInfo?.requiresVehicle === true

  const selectedVehicleType = useWatch({
    control,
    name: 'estimatedVehicleType',
  })
  const deliveryAddress = useWatch({
    control,
    name: 'deliveryAddress',
  }) as IAddress | null

  const selectedRateInfo =
    shippingRates.find((rate) => rate.type === selectedVehicleType) || null

  let totalTransportCost: number | null = null
  if (selectedRateInfo && deliveryAddress?.distanceInKm) {
    totalTransportCost =
      selectedRateInfo.ratePerKm * deliveryAddress.distanceInKm
  }

  return (
    <div className='space-y-4'>
      <Controller
        name='deliveryType'
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mod Livrare</FormLabel>
             <Select onValueChange={field.onChange} value={field.value || ''}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder='Alege modul de livrare...' />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DELIVERY_METHODS.map((method) => (
                  <SelectItem key={method.key} value={method.key}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {showVehicleSelector && (
        <div className='flex flex-col gap-1'>
          <Controller
            name='estimatedVehicleType'
            control={control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tip Vehicul (pt. Transport)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                   value={field.value || ''}
                  disabled={shippingRates.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          shippingRates.length === 0
                            ? 'Nu sunt date...' 
                            : 'Alege tipul de vehicul...'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {shippingRates.map((rate) => (
                      <SelectItem key={rate._id} value={rate.type}>
                        {rate.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedRateInfo && (
            <div className='text-sm text-muted-foreground mt-1 space-y-1'>
              <p>
                Tarif selectat:{' '}
                <span className='font-semibold text-primary'>
                  {formatCurrency(selectedRateInfo.ratePerKm)} / KM
                </span>
              </p>
              {totalTransportCost !== null && (
                <p>
                  Cost total transport:{' '}
                  <span className='font-semibold text-primary'>
                    {formatCurrency(totalTransportCost)}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
