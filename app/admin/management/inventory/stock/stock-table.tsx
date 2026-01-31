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
import { Button } from '@/components/ui/button'
import { getAggregatedStockStatus } from '@/lib/db/modules/inventory/inventory.actions.read'
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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface StockTableProps {
  initialStockData: {
    data: AggregatedStockItem[]
    totalPages: number
    totalDocs: number
    totals: { totalValue: number }
  }
}

export function StockTable({ initialStockData }: StockTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const page = Number(searchParams.get('page')) || 1
  const [stockData, setStockData] = useState<AggregatedStockItem[]>(
    initialStockData?.data || [],
  )
  const [loading, setLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(
    initialStockData?.totalPages || 1,
  )
  const [totalDocs, setTotalDocs] = useState(initialStockData?.totalDocs || 0)

  // State pentru totaluri (Valoare)
  const [totals, setTotals] = useState(
    initialStockData?.totals || { totalValue: 0 },
  )

  const [selectedUnits, setSelectedUnits] = useState<{ [key: string]: string }>(
    () => {
      if (typeof window === 'undefined') {
        return {}
      }
      try {
        const savedPreferences = window.localStorage.getItem(
          'stockUnitPreferences',
        )
        return savedPreferences ? JSON.parse(savedPreferences) : {}
      } catch (error) {
        console.error(
          'Failed to parse unit preferences from localStorage',
          error,
        )
        return {}
      }
    },
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          'stockUnitPreferences',
          JSON.stringify(selectedUnits),
        )
      } catch (error) {
        console.error('Failed to save unit preferences to localStorage', error)
      }
    }
  }, [selectedUnits])

  const fetchStock = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAggregatedStockStatus(searchQuery, page)
      setStockData(res.data)
      setTotalPages(res.totalPages || 1)
      setTotalDocs(res.totalDocs || 0)
      setTotals(res.totals || { totalValue: 0 })
    } catch (error) {
      console.error('Failed to fetch stock:', error)
      setStockData([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, page])

  const handleSearchChange = (query: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // Reset pagina
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  const handleUnitChange = (itemId: string, newUnit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [itemId]: newUnit }))
  }

  return (
    <div className='h-[calc(100vh-7rem)] flex flex-col border p-4 rounded-2xl '>
      {/* HEADER */}
      <div className='flex justify-between items-center mb-2'>
        <div className='flex flex-col'>
          <h3 className='font-bold pt-1'>Stoc Total Agregat</h3>
          <div className='flex gap-4 text-sm mt-1'>
            <span className='text-muted-foreground'>
              Produse:{' '}
              <span className='font-medium text-foreground'>{totalDocs}</span>
            </span>
            <span className='text-muted-foreground'>
              Valoare Stoc:{' '}
              <span className='font-bold text-green-600'>
                {formatCurrency(totals.totalValue)}
              </span>
            </span>
          </div>
        </div>
        <div className='w-[400px]'>
          <StockSearchFilter
            onSearchChange={handleSearchChange}
            defaultValue={searchQuery}
          />
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center h-full'>
          <p>Se încarcă...</p>
        </div>
      ) : (
        <>
          {/* TABEL WRAPPER  */}
          <div className='overflow-auto flex-1 border rounded-md relative'>
            <Table>
              <TableHeader className='sticky top-0 bg-background z-20 shadow-sm'>
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
                {stockData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='h-24 text-center'>
                      Nu există date despre stocuri.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockData.map((item) => {
                    const allUnits = [
                      { unitName: item.unit, baseUnitEquivalent: 1 },
                      ...(item.packagingOptions || []).filter(
                        (p) => p.unitName !== item.unit,
                      ),
                    ]
                    const selectedUnitName =
                      selectedUnits[item._id] || item.unit
                    const selectedConversion = allUnits.find(
                      (u) => u.unitName === selectedUnitName,
                    )
                    const conversionFactor =
                      selectedConversion?.baseUnitEquivalent ?? 1

                    // Calculăm valorile
                    const convertedTotal = item.totalStock / conversionFactor
                    const convertedReserved =
                      item.totalReserved / conversionFactor
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
                      <TableRow
                        key={item._id}
                        className='hover:bg-muted/50 py-0'
                      >
                        <TableCell className='font-mono py-0'>
                          <Link
                            href={`/admin/management/inventory/stock/details/${item._id}`}
                            className='underline hover:text-primary'
                          >
                            {item.productCode || '-'}
                          </Link>
                        </TableCell>
                        <TableCell className='py-0'>
                          <Link
                            href={`/admin/management/inventory/stock/details/${item._id}`}
                            className='hover:underline block truncate max-w-[400px]'
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell className='text-right text-muted-foreground py-0'>
                          {formatCurrency(convertedAvgCost)}
                        </TableCell>
                        <TableCell className='text-right text-yellow-600 dark:text-yellow-500 py-0'>
                          {formatCurrency(convertedLastPrice)}
                        </TableCell>
                        <TableCell className='text-right text-red-500 py-0'>
                          {formatCurrency(convertedMinPrice)}
                        </TableCell>
                        <TableCell className='text-right text-green-500 py-0'>
                          {formatCurrency(convertedMaxPrice)}
                        </TableCell>
                        <TableCell className='text-right font-semibold py-0'>
                          {convertedTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className='text-right text-orange-500 py-0'>
                          {convertedReserved.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold py-0 text-lg ${item.availableStock >= 0 ? 'text-green-600' : 'text-destructive'}`}
                        >
                          {convertedAvailable.toFixed(2)}
                        </TableCell>
                        <TableCell className='py-0'>
                          <Select
                            value={selectedUnitName}
                            onValueChange={(newUnit) =>
                              handleUnitChange(item._id, newUnit)
                            }
                          >
                            <SelectTrigger className='h-7 w-full text-xs py-[-1px]'>
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
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* FOOTER PAGINARE */}
          <div className='flex justify-between items-center pt-2 mt-2 border-t'>
            <div className='text-sm text-muted-foreground'>
              Pagina {page} din {totalPages}
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className='h-4 w-4 mr-1' />
                Anterior
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Următor
                <ChevronRight className='h-4 w-4 ml-1' />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
