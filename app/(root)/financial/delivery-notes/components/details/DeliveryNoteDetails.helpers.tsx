import { DeliveryNoteLineDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import React from 'react'

// --- LOGIC: Smart Description (Refolosită) ---
export function getSmartDescription(item: DeliveryNoteLineDTO): string | null {
  if (!item.packagingOptions || item.packagingOptions.length === 0) return null

  const currentUom = item.unitOfMeasure.toLowerCase()
  const currentOption = item.packagingOptions.find(
    (opt) => opt.unitName.toLowerCase() === currentUom
  )

  if (!currentOption) return null

  const candidates = item.packagingOptions
    .filter((opt) => opt.baseUnitEquivalent < currentOption.baseUnitEquivalent)
    .sort((a, b) => b.baseUnitEquivalent - a.baseUnitEquivalent)

  if (candidates.length === 0 && currentOption.baseUnitEquivalent <= 1)
    return null

  let targetUnitName = item.baseUnit
  let ratio = currentOption.baseUnitEquivalent

  if (candidates.length > 0) {
    const bestSubUnit = candidates[0]
    targetUnitName = bestSubUnit.unitName
    ratio = currentOption.baseUnitEquivalent / bestSubUnit.baseUnitEquivalent
  }

  if (ratio > 1) {
    const formattedRatio = Number(ratio.toFixed(2))
    return `Produs livrat la ${currentOption.unitName} (1 ${currentOption.unitName} = ${formattedRatio} ${targetUnitName})`
  }
  return null
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
