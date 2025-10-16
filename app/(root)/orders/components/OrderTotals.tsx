'use client'

import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'
import { formatCurrency, round2 } from '@/lib/utils'

export function OrderTotals() {
  const { control } = useFormContext()

  const lineItems = useWatch({
    control,
    name: 'lineItems',
    defaultValue: [],
  }) as OrderLineItemInput[]

  const {
    productsSubtotal,
    servicesSubtotal,
    manualSubtotal,
    productsVat,
    servicesVat,
    manualVat,
  } = useMemo(() => {
    const totals = lineItems.reduce(
      (acc, item) => {
        const itemSubtotal =
          (item.priceAtTimeOfOrder || 0) * (Number(item.quantity) || 0)
        const itemVatValue = item.vatRateDetails?.value || 0

        if (item.productId && !item.isManualEntry) {
          acc.productsSubtotal += itemSubtotal
          acc.productsVat += itemVatValue
        } else if (item.isManualEntry) {
          acc.manualSubtotal += itemSubtotal
          acc.manualVat += itemVatValue
        } else {
          acc.servicesSubtotal += itemSubtotal
          acc.servicesVat += itemVatValue
        }

        return acc
      },
      {
        productsSubtotal: 0,
        servicesSubtotal: 0,
        manualSubtotal: 0,
        productsVat: 0,
        servicesVat: 0,
        manualVat: 0,
      }
    )

    return {
      productsSubtotal: round2(totals.productsSubtotal),
      servicesSubtotal: round2(totals.servicesSubtotal),
      manualSubtotal: round2(totals.manualSubtotal),
      productsVat: round2(totals.productsVat),
      servicesVat: round2(totals.servicesVat),
      manualVat: round2(totals.manualVat),
    }
  }, [lineItems])

  const finalServicesSubtotal = servicesSubtotal
  const overallSubtotal =
    productsSubtotal + finalServicesSubtotal + manualSubtotal
  const overallVat = productsVat + servicesVat + manualVat
  const grandTotal = overallSubtotal + overallVat

  return (
    <div className='p-4 border rounded-lg flex flex-col h-full'>
      <h2 className='text-lg font-semibold mb-2'>Totaluri Comandă</h2>

      <div className='flex-grow space-y-2'>
        <div className='flex justify-between text-sm font-medium'>
          <span>Subtotal Articole</span>
          <span>{formatCurrency(productsSubtotal)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span className='pl-4 text-muted-foreground'>TVA Articole</span>
          <span className='font-medium text-muted-foreground'>
            {formatCurrency(productsVat)}
          </span>
        </div>

        <div className='flex justify-between text-sm font-medium mt-2 gap-3'>
          <span>Subtotal Servicii (incl. transport)</span>
          <span>{formatCurrency(finalServicesSubtotal)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span className='pl-4 text-muted-foreground'>TVA Servicii</span>
          <span className='font-medium text-muted-foreground'>
            {formatCurrency(servicesVat)}
          </span>
        </div>

        <div className='flex justify-between text-sm font-medium mt-2'>
          <span>Subtotal Linii Libere</span>
          <span>{formatCurrency(manualSubtotal)}</span>
        </div>
        <div className='flex justify-between text-sm'>
          <span className='pl-4 text-muted-foreground'>TVA Linii Libere</span>
          <span className='font-medium text-muted-foreground'>
            {formatCurrency(manualVat)}
          </span>
        </div>
      </div>

      <div className='mt-auto'>
        <hr className='my-2' />
        <div className='flex justify-between text-md font-semibold'>
          <span className='text-muted-foreground'>Subtotal General</span>
          <span className='text-muted-foreground'>
            {formatCurrency(overallSubtotal)}
          </span>
        </div>
        <div className='flex justify-between text-md font-semibold'>
          <span className='text-muted-foreground'>TVA General</span>
          <span className='text-muted-foreground'>
            {formatCurrency(overallVat)}
          </span>
        </div>
        <div className='flex justify-between text-lg font-bold'>
          <span>Total General</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>
  )
}
