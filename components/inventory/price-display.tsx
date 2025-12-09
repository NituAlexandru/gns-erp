'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

interface PackagingOption {
  unitName: string
  baseUnitEquivalent: number
}

interface PriceDisplayProps {
  baseCost: number
  baseUnit: string
  options: PackagingOption[]
  className?: string
}

export function PriceDisplay({
  baseCost,
  baseUnit,
  options,
  className,
}: PriceDisplayProps) {
  // Construim lista completă de unități
  const allUnits = [{ unitName: baseUnit, baseUnitEquivalent: 1 }, ...options]


  // Calculăm prețul pentru fiecare unitate și creăm string-ul în formatul dorit
  const priceParts = allUnits.map((unit) => {
    const convertedCost = baseCost * unit.baseUnitEquivalent
    // Formatăm prețul și adăugăm unitatea de măsură
    return `${formatCurrency(convertedCost)} / ${unit.unitName}`
  })

  // Unim toate textele cu un separator
  return <span className={cn(className)}>{priceParts.join(' - ')}</span>
}
