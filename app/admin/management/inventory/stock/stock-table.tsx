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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAggregatedStockStatus } from '@/lib/db/modules/inventory/inventory.actions'
import { AggregatedStockItem } from '@/lib/db/modules/inventory/types'
import { formatCurrency } from '@/lib/utils'
import { StockSearchFilter } from '@/components/inventory/stock-search-filter'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StockTableProps {
  initialStockData: AggregatedStockItem[]
}

export function StockTable({ initialStockData }: StockTableProps) {
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
        const savedPreferences = window.localStorage.getItem(
          'stockUnitPreferences'
        )
        return savedPreferences ? JSON.parse(savedPreferences) : {}
      } catch (error) {
        console.error(
          'Failed to parse unit preferences from localStorage',
          error
        )
        return {}
      }
    }
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'stockUnitPreferences',
          JSON.stringify(selectedUnits)
        )
      } catch (error) {
        console.error('Failed to save unit preferences to localStorage', error)
      }
    }
  }, [selectedUnits])

  const fetchStock = useCallback(async (query: string) => {
    setLoading(true)
    const data = await getAggregatedStockStatus(query)
    setStockData(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (searchQuery !== '') {
      fetchStock(searchQuery)
    } else {
      fetchStock('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const handleUnitChange = (itemId: string, newUnit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [itemId]: newUnit }))
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Stoc Total Agregat</CardTitle>
        <StockSearchFilter onSearchChange={setSearchQuery} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='flex h-64 items-center justify-center'>
            Se încarcă...
          </div>
        ) : (
          <Table className='block h-[calc(100vh-14rem)] overflow-auto'>
            <TableHeader className='sticky top-0 z-10 bg-background '>
              <TableRow>
                <TableHead>Cod Produs</TableHead>
                <TableHead>Nume Produs</TableHead>
                <TableHead className='text-right'>
                  Preț Mediu Ponderat
                </TableHead>
                <TableHead className='text-right'>Ultimul Preț</TableHead>
                <TableHead className='text-right'>Preț Min</TableHead>
                <TableHead className='text-right'>Preț Max</TableHead>
                <TableHead className='text-right'>Stoc Total</TableHead>
                <TableHead className='text-right'>Rezervat</TableHead>
                <TableHead className='text-right'>Disponibil</TableHead>
                <TableHead className='w-[120px]'>UM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className='h-24 text-center'>
                    Nu există date despre stocuri.
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

                // Calculăm TOATE valorile în unitatea selectată
                const convertedTotal = item.totalStock / conversionFactor
                const convertedReserved = item.totalReserved / conversionFactor
                const convertedAvailable =
                  item.availableStock / conversionFactor
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
                    <TableCell className='text-right'>
                      {convertedTotal.toFixed(2)}
                    </TableCell>
                    <TableCell className='text-right text-orange-500'>
                      {convertedReserved.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${item.availableStock >= 0 ? '' : 'text-destructive'}`}
                    >
                      {convertedAvailable.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedUnitName}
                        onValueChange={(newUnit) =>
                          handleUnitChange(item._id, newUnit)
                        }
                      >
                        <SelectTrigger className='w-[100px] h-8 p-2 text-sm cursor-pointer'>
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
        )}
      </CardContent>
    </Card>
  )
}
