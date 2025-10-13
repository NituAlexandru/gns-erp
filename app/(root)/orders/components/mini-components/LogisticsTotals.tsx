'use client'

import { useMemo } from 'react'
import { OrderLineItemInput } from '@/lib/db/modules/order/types'
import { Weight, Box } from 'lucide-react'
import { formatDecimal } from '@/lib/utils'

interface LogisticsTotalsProps {
  lineItems: OrderLineItemInput[]
}

export function LogisticsTotals({ lineItems }: LogisticsTotalsProps) {
  const totals = useMemo(() => {
    if (!lineItems || lineItems.length === 0) {
      return null
    }

    const calculatedTotals = lineItems.reduce(
      (acc, item) => {
        // Luăm în calcul doar produsele, nu serviciile sau liniile manuale
        if (item.productId && !item.isManualEntry) {
          const quantity = Number(item.quantity) || 0

          //  Calculăm proprietățile pentru 1 unitate de bază
          // Adăugăm o verificare de siguranță pentru a evita împărțirea la zero
          const safePackagingQty =
            item.packagingQuantity && item.packagingQuantity > 0
              ? item.packagingQuantity
              : 1
          const weightPerBaseUnit = (item.weight || 0) / safePackagingQty
          const volumePerBaseUnit = (item.volume || 0) / safePackagingQty

          // Calculăm cantitatea totală în unități de bază
          let conversionFactor = 1
          if (item.unitOfMeasure !== item.baseUnit) {
            const option = item.packagingOptions?.find(
              (opt: { unitName: string; baseUnitEquivalent: number }) =>
                opt.unitName === item.unitOfMeasure
            )
            if (option) {
              conversionFactor = option.baseUnitEquivalent
            }
          }
          const totalBaseUnits = quantity * conversionFactor

          // Calculăm și acumulăm totalurile
          acc.totalWeight += weightPerBaseUnit * totalBaseUnits
          acc.totalVolume += volumePerBaseUnit * totalBaseUnits

          acc.maxDimensions.l = Math.max(acc.maxDimensions.l, item.length || 0)
          acc.maxDimensions.w = Math.max(acc.maxDimensions.w, item.width || 0)
          acc.maxDimensions.h = Math.max(acc.maxDimensions.h, item.height || 0)
        }
        return acc
      },
      { totalWeight: 0, totalVolume: 0, maxDimensions: { l: 0, w: 0, h: 0 } }
    )

    // Returnăm null dacă nu s-a calculat nicio greutate, pentru a nu afișa 0-uri inutile
    return calculatedTotals.totalWeight > 0 ? calculatedTotals : null
  }, [lineItems])

  if (!totals) {
    return null
  }

  // formatarea pentru afișare
  return (
    <div className='flex gap-4 text-sm text-muted-foreground'>
      <div className='flex items-center gap-2' title='Greutate Totală'>
        <Weight className='h-4 w-4' />
        <span>
          <strong>{formatDecimal(totals.totalWeight, 2)} kg</strong>
        </span>
      </div>
      <div className='flex items-center gap-2' title='Volum Total'>
        <Box className='h-4 w-4' />
        <span>
          <strong>{formatDecimal(totals.totalVolume, 3)} m³</strong>
        </span>
      </div>
    </div>
  )
}
