'use client'

import { useWatch, useFormContext } from 'react-hook-form'
import { ProductLineItemRow } from './ProductLineItemRow' // Fișier nou
import { ServiceLineItemRow } from './ServiceLineItemRow' // Fișier nou
import { ManualLineItemRow } from './ManualLineItemRow' // Fișier nou
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'

export interface OrderLineItemRowProps {
  index: number
  isAdmin: boolean
  vatRates: VatRateDTO[]
  remove: (index: number) => void
}

export function OrderLineItemRow(props: OrderLineItemRowProps) {
  const { control } = useFormContext()
  // Avem nevoie de itemData aici pentru a decide ce componentă să afișăm
  const itemData = useWatch({ control, name: `lineItems.${props.index}` })

  const { productId, isManualEntry } = itemData || {}

  // Logica de distribuire
  if (isManualEntry) {
    return <ManualLineItemRow {...props} itemData={itemData} />
  }

  if (productId) {
    return <ProductLineItemRow {...props} itemData={itemData} />
  }

  // Altfel, este un serviciu
  return <ServiceLineItemRow {...props} itemData={itemData} />
}
