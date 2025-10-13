'use client'

import { useState, useEffect } from 'react'
import { useFormContext, Controller, useWatch } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getShippingRates } from '@/lib/db/modules/setting/shipping-rates/shipping.actions'
import { ShippingRateDTO } from '@/lib/db/modules/setting/shipping-rates/types'
import { DELIVERY_METHODS } from '@/lib/db/modules/order/constants'
import { IAddress } from '@/lib/db/modules/client/types'
import { formatCurrency } from '@/lib/utils'

export function OrderLogistics() {
  const { control } = useFormContext()
  const [shippingRates, setShippingRates] = useState<ShippingRateDTO[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const deliveryMethodKey = useWatch({ control, name: 'deliveryMethod' })
  const selectedMethodInfo = DELIVERY_METHODS.find(
    (m) => m.key === deliveryMethodKey
  )
  const showVehicleSelector = selectedMethodInfo?.requiresVehicle === true

  const selectedVehicleRateJSON = useWatch({
    control,
    name: 'selectedVehicleRate',
  })
  const deliveryAddress = useWatch({
    control,
    name: 'deliveryAddress',
  }) as IAddress | null

  let selectedRateInfo: ShippingRateDTO | null = null
  if (selectedVehicleRateJSON) {
    try {
      selectedRateInfo = JSON.parse(selectedVehicleRateJSON)
    } catch (e) {
      console.error('Eroare la parsarea datelor vehiculului selectat:', e)
    }
  }

  let totalTransportCost: number | null = null
  if (selectedRateInfo && deliveryAddress?.distanceInKm) {
    totalTransportCost =
      selectedRateInfo.ratePerKm * deliveryAddress.distanceInKm
  }

  useEffect(() => {
    async function fetchRates() {
      setIsLoading(true)
      const result = await getShippingRates()
      if (result.success && result.data) {
        setShippingRates(result.data)
      } else {
        console.error('Failed to fetch shipping rates:', result.message)
      }
      setIsLoading(false)
    }
    fetchRates()
  }, [])

  return (
    <div className='flex flex-col gap-4'>
      {/* Selector Mod Livrare */}
      <div className='flex flex-col gap-2'>
        <label className='font-medium'>Mod Livrare</label>
        <Controller
          name='deliveryMethod'
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger>
                <SelectValue placeholder='Alege modul de livrare...' />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_METHODS.map((method) => (
                  <SelectItem key={method.key} value={method.key}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Selector Tip Vehicul */}
      {showVehicleSelector && (
        <div className='flex flex-col gap-1'>
          <label className='font-medium'>Tip Vehicul (pt. Transport)</label>
          <Controller
            name='selectedVehicleRate'
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isLoading ? 'Se încarcă...' : 'Alege tipul de vehicul...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {shippingRates.map((rate) => (
                    <SelectItem key={rate._id} value={JSON.stringify(rate)}>
                      {rate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
