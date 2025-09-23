'use client'

import { useState, useMemo, useEffect } from 'react'

// Definim un tip generic pentru orice obiect care are unități de măsură
type ConvertibleItem = {
  _id: string
  unit: string
  packagingOptions?: {
    unitName: string
    baseUnitEquivalent: number
  }[]
}

// Interfața pentru proprietățile hook-ului, folosind tipul generic
interface UseUnitConversionProps<T extends ConvertibleItem> {
  item: T
  basePrice?: number
  baseStock?: number
}

export function useUnitConversion<T extends ConvertibleItem>({
  item,
  basePrice = 0,
  baseStock = 0,
}: UseUnitConversionProps<T>) {
  const [selectedUnit, setSelectedUnit] = useState(() => {
    if (typeof window === 'undefined') {
      return item.unit
    }
    try {
      const savedPrefs = window.localStorage.getItem('unitPreferences')
      const preferences = savedPrefs ? JSON.parse(savedPrefs) : {}
      return preferences[item._id] || item.unit
    } catch (error) {
      console.error('Eroare la citirea preferințelor:', error)
      return item.unit
    }
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedPrefs = window.localStorage.getItem('unitPreferences')
        const preferences = savedPrefs ? JSON.parse(savedPrefs) : {}
        preferences[item._id] = selectedUnit
        window.localStorage.setItem(
          'unitPreferences',
          JSON.stringify(preferences)
        )
      } catch (error) {
        console.error('Eroare la salvarea preferințelor:', error)
      }
    }
  }, [selectedUnit, item._id])

  const conversionData = useMemo(() => {
    const allUnitsRaw = [
      { unitName: item.unit, baseUnitEquivalent: 1 },
      ...(item.packagingOptions || []),
    ]

    const allUnits = Array.from(
      new Map(allUnitsRaw.map((u) => [u.unitName, u])).values()
    )

    const selectedConversion = allUnits.find((u) => u.unitName === selectedUnit)
    const factor = selectedConversion?.baseUnitEquivalent ?? 1

    const convertedStock = baseStock / factor
    const convertedPrice = basePrice * factor

    return { allUnits, factor, convertedStock, convertedPrice }
  }, [item, selectedUnit, basePrice, baseStock])

  return {
    selectedUnit,
    handleUnitChange: setSelectedUnit,
    allUnits: conversionData.allUnits,
    conversionFactor: conversionData.factor,
    convertedStock: conversionData.convertedStock,
    convertedPrice: conversionData.convertedPrice,
  }
}
