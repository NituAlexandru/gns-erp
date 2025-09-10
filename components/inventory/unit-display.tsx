'use client'

import { cn } from '@/lib/utils'

interface PackagingOption {
  unitName: string
  baseUnitEquivalent: number
}

interface UnitDisplayProps {
  baseQuantity: number
  baseUnit: string
  options: PackagingOption[]
  className?: string 
}

export function UnitDisplay({
  baseQuantity,
  baseUnit,
  options,
  className,
}: UnitDisplayProps) {

  const displayParts: string[] = [`${baseQuantity.toFixed(2)} ${baseUnit}`]

  options.forEach((option) => {
  
    if (option.baseUnitEquivalent > 0) {
      const convertedQuantity = baseQuantity / option.baseUnitEquivalent

      const formattedQty = Number.isInteger(convertedQuantity)
        ? convertedQuantity
        : convertedQuantity.toFixed(2)

      displayParts.push(`${formattedQty} ${option.unitName}`)
    }
  })

  return (
    <span className={cn('font-bold', className)}>
      {displayParts.join(' / ')}
    </span>
  )
}
