'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { IAddress } from '@/lib/db/modules/client/types'
import { calculateShippingCost } from '@/lib/db/modules/order/order.actions'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'
import { formatCurrency } from '@/lib/utils'

interface OrderTotalsProps {
  selectedAddress: IAddress | null
}

export function OrderTotals({ selectedAddress }: OrderTotalsProps) {
  const { control, setValue } = useFormContext()
  const [shippingCost, setShippingCost] = useState(0)

  const lineItems = useWatch({
    control,
    name: 'lineItems',
    defaultValue: [],
  }) as OrderLineItemInput[]
  const vehicleType = useWatch({ control, name: 'estimatedVehicleType' })

  const { subtotal, vatTotal } = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        const itemSubtotal =
          (item.priceAtTimeOfOrder || 0) * (item.quantity || 0)
        const itemVatValue = item.vatRateDetails?.value || 0

        acc.subtotal += itemSubtotal
        acc.vatTotal += itemVatValue
        return acc
      },
      { subtotal: 0, vatTotal: 0 }
    )
  }, [lineItems])

  useEffect(() => {
    async function getShippingCost() {
      if (selectedAddress?.distanceInKm && vehicleType) {
        const cost = await calculateShippingCost(
          vehicleType,
          selectedAddress.distanceInKm
        )
        setShippingCost(cost)
        setValue('shippingCost', cost)
      } else {
        setShippingCost(0)
        setValue('shippingCost', 0)
      }
    }
    getShippingCost()
  }, [selectedAddress, vehicleType, setValue])

  const grandTotal = subtotal + vatTotal + shippingCost

  return (
    <div className='p-4 border rounded-lg space-y-2'>
      <h2 className='text-lg font-semibold mb-2'>4. Totaluri Comandă</h2>
      <div className='flex justify-between text-sm'>
        <span className='text-muted-foreground'>Subtotal (fără TVA)</span>
        <span className='font-medium'>{formatCurrency(subtotal)}</span>
      </div>
      <div className='flex justify-between text-sm'>
        <span className='text-muted-foreground'>Total TVA</span>
        <span className='font-medium'>{formatCurrency(vatTotal)}</span>
      </div>
      <div className='flex justify-between text-sm'>
        <span className='text-muted-foreground'>Cost Transport</span>
        <span className='font-medium'>{formatCurrency(shippingCost)}</span>
      </div>
      <hr className='my-2' />
      <div className='flex justify-between text-lg font-bold'>
        <span>Total General</span>
        <span>{formatCurrency(grandTotal)}</span>
      </div>
    </div>
  )
}
