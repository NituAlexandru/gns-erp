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
import { Checkbox } from '@/components/ui/checkbox'
import { ShippingRateDTO } from '@/lib/db/modules/setting/shipping-rates/types'
import {
  DELIVERY_METHODS,
  ALLOWED_VEHICLES_FOR_METHOD,
} from '@/lib/db/modules/order/constants'
import { IAddress } from '@/lib/db/modules/client/types'
import { formatCurrency } from '@/lib/utils'
import { useEffect, useMemo } from 'react'

export function OrderLogistics({
  shippingRates,
}: {
  shippingRates: ShippingRateDTO[]
}) {
  const { control, setValue } = useFormContext()

  const deliveryMethodKey = useWatch({ control, name: 'deliveryType' })
  const isThirdParty = useWatch({ control, name: 'isThirdPartyHauler' })
  const selectedVehicleType = useWatch({
    control,
    name: 'estimatedVehicleType',
  })
  const deliveryAddress = useWatch({
    control,
    name: 'deliveryAddress',
  }) as IAddress | null

  const selectedMethodInfo = DELIVERY_METHODS.find(
    (m) => m.key === deliveryMethodKey
  )
  const showVehicleSection = selectedMethodInfo?.requiresVehicle === true

  // --- FILTRARE VEHICULE ---
  const filteredRates = useMemo(() => {
    if (!deliveryMethodKey) return []

    const allowed = ALLOWED_VEHICLES_FOR_METHOD[deliveryMethodKey]

    if (!allowed) return []
    if (allowed === 'ALL') return shippingRates

    return shippingRates.filter((rate) => allowed.includes(rate.type))
  }, [shippingRates, deliveryMethodKey])

  // --- LOGICĂ RESETARE & AUTO-SELECTARE --- //
  useEffect(() => {
    if (isThirdParty) {
      setValue('estimatedVehicleType', undefined)
    } else if (filteredRates.length === 1) {
      const singleOption = filteredRates[0].type
      if (selectedVehicleType !== singleOption) {
        setValue('estimatedVehicleType', singleOption)
      }
    } else if (
      selectedVehicleType &&
      !filteredRates.find((r) => r.type === selectedVehicleType)
    ) {
      setValue('estimatedVehicleType', undefined)
    }
  }, [isThirdParty, filteredRates, setValue, selectedVehicleType])

  // Calcul Costuri (Local pentru afișare)
  const selectedRateInfo =
    (!isThirdParty &&
      shippingRates.find((rate) => rate.type === selectedVehicleType)) ||
    null

  let totalTransportCost: number | null = null
  if (selectedRateInfo && deliveryAddress?.distanceInKm) {
    totalTransportCost =
      selectedRateInfo.ratePerKm * deliveryAddress.distanceInKm
  }

  // --- SINCRONIZARE CU FORMULARUL ---
  // Salvăm costul calculat în câmpul 'recommendedShippingCost' pentru a fi accesibil în OrderItemsManager
  useEffect(() => {
    if (totalTransportCost !== null) {
      setValue('recommendedShippingCost', Number(totalTransportCost.toFixed(2)))
    } else {
      setValue('recommendedShippingCost', 0)
    }
  }, [totalTransportCost, setValue])

  return (
    <div className='space-y-4'>
      {/* Mod Livrare */}
      <Controller
        name='deliveryType'
        control={control}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mod Livrare</FormLabel>
            <Select
              onValueChange={(val) => {
                field.onChange(val)
                if (val === 'PICK_UP_SALE') {
                  setValue('isThirdPartyHauler', false)
                }
              }}
              value={field.value || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder='Alege modul de livrare...' />
                </SelectTrigger>
              </FormControl>
              <SelectContent className='bg-white dark:bg-muted'>
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

      {showVehicleSection && (
        <div className='p-3 border rounded-md bg-muted/30 space-y-4'>
          {/* Checkbox Terț */}
          <Controller
            name='isThirdPartyHauler'
            control={control}
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Livrare cu transportator terț</FormLabel>
                  <p className='text-[0.8rem] text-muted-foreground'>
                    Bifează dacă transportul nu se face cu flota proprie.
                  </p>
                </div>
              </FormItem>
            )}
          />

          {/* Selector Vehicul (Flotă Proprie) */}
          {!isThirdParty && (
            <div className='flex flex-col gap-1 pt-2'>
              <Controller
                name='estimatedVehicleType'
                control={control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tip Vehicul (Flotă Proprie)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={filteredRates.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              filteredRates.length === 0
                                ? 'Niciun vehicul compatibil...'
                                : 'Alege tipul de vehicul...'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredRates.map((rate) => (
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

              {/* Costuri */}
              {selectedRateInfo && (
                <div className='text-sm text-muted-foreground mt-2 p-2 bg-background rounded border space-y-1'>
                  <div className='flex justify-between'>
                    <span>Tarif minim km:</span>
                    <span className='font-semibold text-primary'>
                      {formatCurrency(selectedRateInfo.ratePerKm)} / km
                    </span>
                  </div>
                  {selectedRateInfo.costPerKm && (
                    <div className='flex justify-between text-xs'>
                      <span>Cost intern est.:</span>
                      <span>
                        {formatCurrency(selectedRateInfo.costPerKm)} / km
                      </span>
                    </div>
                  )}
                  {totalTransportCost !== null && (
                    <div className='flex justify-between border-t pt-1 mt-1'>
                      <span className='font-medium text-foreground'>
                        Tarif Recomandat:
                      </span>
                      <span className='font-bold text-primary'>
                        {formatCurrency(totalTransportCost)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
