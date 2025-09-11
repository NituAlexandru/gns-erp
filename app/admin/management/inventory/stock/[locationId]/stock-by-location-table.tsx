'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { getStockByLocation } from '@/lib/db/modules/inventory/inventory.actions'
import {
  AggregatedStockItem,
  InventoryLocation,
} from '@/lib/db/modules/inventory/types'
import { formatCurrency } from '@/lib/utils'
import { StockSearchFilter } from '@/components/inventory/stock-search-filter'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StockByLocationTableProps {
  initialStockData: AggregatedStockItem[]
  locationId: InventoryLocation
  locationName: string
}

export function StockByLocationTable({
  initialStockData,
  locationId,
  locationName,
}: StockByLocationTableProps) {
  const [stockData, setStockData] =
    useState<AggregatedStockItem[]>(initialStockData)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedUnits, setSelectedUnits] = useState<{ [key: string]: string }>(
    () => {
      if (typeof window === 'undefined') {
        return {}
      }
      try {
        const saved = window.localStorage.getItem('stockUnitPreferences')
        return saved ? JSON.parse(saved) : {}
      } catch (error) {
        console.error(
          'Failed to parse unit preferences from localStorage',
          error
        )
        return {}
      }
    }
  )

  // Efect pentru a salva preferințele în localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'stockUnitPreferences',
        JSON.stringify(selectedUnits)
      )
    }
  }, [selectedUnits])

  const fetchStock = useCallback(
    async (query: string) => {
      setLoading(true)
      const data = await getStockByLocation(locationId, query)
      setStockData(data)
      setLoading(false)
    },
    [locationId]
  )

  useEffect(() => {
    fetchStock(searchQuery)
  }, [searchQuery, fetchStock])

  const handleUnitChange = (itemId: string, newUnit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [itemId]: newUnit }))
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Stoc pentru locația: {locationName}</CardTitle>
        <StockSearchFilter onSearchChange={setSearchQuery} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='flex h-64 items-center justify-center'>
            Se încarcă...
          </div>
        ) : (
          <div className='overflow-y-auto h-[calc(100vh-14rem)]'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cod Produs</TableHead>
                  <TableHead>Nume Produs</TableHead>
                  <TableHead className='text-right'>
                    Preț Mediu Ponderat
                  </TableHead>
                  <TableHead className='text-right'>Ultimul Preț</TableHead>
                  <TableHead className='text-right'>Preț Min</TableHead>
                  <TableHead className='text-right'>Preț Max</TableHead>
                  <TableHead className='text-right'>Cantitate</TableHead>
                  <TableHead className='w-[120px]'>UM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className='h-24 text-center'>
                      Nu există date despre stocuri pentru această locație.
                    </TableCell>
                  </TableRow>
                )}
                {stockData.map((item) => {
                  const allUnits = [
                    { unitName: item.unit, baseUnitEquivalent: 1 },
                    ...(item.packagingOptions || []),
                  ]
                  const selectedUnitName = selectedUnits[item._id] || item.unit
                  const selectedConversion = allUnits.find(
                    (u) => u.unitName === selectedUnitName
                  )
                  const conversionFactor =
                    selectedConversion?.baseUnitEquivalent ?? 1
                  const convertedQuantity = item.totalStock / conversionFactor

                  const convertedAvgCost =
                    (item.averageCost ?? 0) * conversionFactor
                  const convertedLastPrice =
                    (item.lastPrice ?? 0) * conversionFactor
                  const convertedMinPrice =
                    (item.minPrice ?? 0) * conversionFactor
                  const convertedMaxPrice =
                    (item.maxPrice ?? 0) * conversionFactor

                  return (
                    <TableRow key={item._id}>
                      <TableCell>
                        <Link
                          href={`/admin/management/inventory/stock/details/${item._id}`}
                        >
                          {item.productCode || '-'}
                        </Link>
                      </TableCell>
                      <TableCell className='font-medium'>
                        <Link
                          href={`/admin/management/inventory/stock/details/${item._id}`}
                        >
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(convertedAvgCost)}
                      </TableCell>
                      <TableCell className='text-right text-yellow-500'>
                        {formatCurrency(convertedLastPrice)}
                      </TableCell>
                      <TableCell className='text-right text-red-500'>
                        {formatCurrency(convertedMinPrice)}
                      </TableCell>
                      <TableCell className='text-right text-green-500'>
                        {formatCurrency(convertedMaxPrice)}
                      </TableCell>
                      <TableCell className='text-right font-bold'>
                        {convertedQuantity.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedUnitName}
                          onValueChange={(newUnit) =>
                            handleUnitChange(item._id, newUnit)
                          }
                        >
                          <SelectTrigger className='w-[100px] h-8 px-3 text-sm'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allUnits.map((u) => (
                              <SelectItem key={u.unitName} value={u.unitName}>
                                {u.unitName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
