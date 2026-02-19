import { DeliveryNoteLineDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import React from 'react'

export function getSmartDescription(
  item: DeliveryNoteLineDTO,
): { val: number; unit: string }[] | null {
  const baseQty =
    item.quantityInBaseUnit ?? item.quantity * (item.conversionFactor || 1)
  const baseUnit = (item.baseUnit || 'bucata').toLowerCase()
  const selectedUnit = item.unitOfMeasure.toLowerCase()

  const equivalents: { val: number; unit: string }[] = []

  if (baseUnit !== selectedUnit) {
    equivalents.push({ val: Number(baseQty.toFixed(3)), unit: baseUnit })
  }

  if (item.packagingOptions && item.packagingOptions.length > 0) {
    item.packagingOptions.forEach((opt) => {
      const optUnit = opt.unitName.toLowerCase()

      if (
        optUnit !== selectedUnit &&
        optUnit !== baseUnit &&
        opt.baseUnitEquivalent > 0
      ) {
        const qtyInThisOpt = baseQty / opt.baseUnitEquivalent
        equivalents.push({
          val: Number(qtyInThisOpt.toFixed(3)),
          unit: optUnit,
        })
      }
    })
  }

  if (equivalents.length === 0) return null

  return equivalents
}

// --- UI COMPONENTS ---
export const DetailRow = ({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon?: LucideIcon
  label: string
  value: React.ReactNode
  className?: string
}) => (
  <div className={cn('flex items-center gap-2 text-sm', className)}>
    {Icon && <Icon className='h-4 w-4 text-muted-foreground mt-0.5 shrink-0' />}
    <div className='flex gap-2 items-center w-full'>
      <span className='text-muted-foreground font-semibold tracking-wide whitespace-nowrap'>
        {label}
      </span>
      <div className='font-medium text-sm break-words leading-tight'>
        {value || '-'}
      </div>
    </div>
  </div>
)
