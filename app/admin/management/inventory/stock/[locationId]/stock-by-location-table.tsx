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
import { Button } from '@/components/ui/button' // Paginare
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
import { ChevronLeft, ChevronRight } from 'lucide-react' // Paginare

interface StockByLocationTableProps {
  initialStockData: AggregatedStockItem[]
  locationId: InventoryLocation
  locationName: string
}

export function StockByLocationTable({
  initialStockData, // Ignorat, incarcam date paginate
  locationId,
  locationName,
}: StockByLocationTableProps) {
  // State Paginare & Data
  const [stockData, setStockData] = useState<AggregatedStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')

  // State Unitati (Neschimbat)
  const [selectedUnits, setSelectedUnits] = useState<{ [key: string]: string }>(
    () => {
      if (typeof window === 'undefined') return {}
      try {
        const saved = window.localStorage.getItem('stockUnitPreferences')
        return saved ? JSON.parse(saved) : {}
      } catch {
        return {}
      }
    }
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'stockUnitPreferences',
        JSON.stringify(selectedUnits)
      )
    }
  }, [selectedUnits])

  // Fetch cu Paginare
  const fetchStock = useCallback(async () => {
    setLoading(true)
    const res = await getStockByLocation(locationId, searchQuery, page)
    setStockData(res.data)
    setTotalPages(res.totalPages || 1)
    setTotalDocs(res.totalDocs || 0)
    setLoading(false)
  }, [locationId, searchQuery, page])

  // Reset page la cautare
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  const handleUnitChange = (itemId: string, newUnit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [itemId]: newUnit }))
  }

  return (
    <div className='h-[calc(100vh-7rem)] flex flex-col border p-4 rounded-2xl'>
      {/* Header */}
      <div className='flex justify-between items-center mb-2'>
        <div>
          <h3 className='font-bold pt-1'>Stoc: {locationName}</h3>
          {totalDocs > 0 && (
            <span className='text-xs text-muted-foreground ml-1'>
              ({totalDocs} produse)
            </span>
          )}
        </div>
        <div className='w-[400px]'>
          <StockSearchFilter onSearchChange={handleSearchChange} />
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center h-full'>
          <p>Se încarcă...</p>
        </div>
      ) : (
        <>
          <div className='overflow-auto flex-1 border rounded-md relative'>
            <Table>
              <TableHeader className='sticky top-0 bg-background z-20 shadow-sm'>
                <TableRow>
                  <TableHead className='w-[120px]'>Cod Produs</TableHead>
                  <TableHead className='min-w-[200px]'>Nume Produs</TableHead>
                  <TableHead className='text-right'>Preț Mediu</TableHead>
                  <TableHead className='text-right'>Ultimul Preț</TableHead>
                  <TableHead className='text-right'>Preț Min</TableHead>
                  <TableHead className='text-right'>Preț Max</TableHead>
                  <TableHead className='text-right font-bold'>
                    Stoc Total
                  </TableHead>
                  <TableHead className='text-right'>Rezervat</TableHead>
                  <TableHead className='text-right font-bold text-green-600'>
                    Disponibil
                  </TableHead>
                  <TableHead className='w-[140px] text-center'>
                    Unitate
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {stockData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='h-24 text-center'>
                      Nu există stocuri pentru această locație.
                    </TableCell>
                  </TableRow>
                ) : (
                  stockData.map((item) => {
                    // Logica de calcul (NESCHIMBATA)
                    const allUnits = [
                      { unitName: item.unit, baseUnitEquivalent: 1 },
                      ...(item.packagingOptions || []),
                    ]
                    const selectedUnitName =
                      selectedUnits[item._id] || item.unit
                    const selectedConversion = allUnits.find(
                      (u) => u.unitName === selectedUnitName
                    )
                    const factor = selectedConversion?.baseUnitEquivalent ?? 1

                    const convertedTotal = item.totalStock / factor
                    const convertedReserved = item.totalReserved / factor
                    const convertedAvailable = item.availableStock / factor
                    const avg = (item.averageCost ?? 0) * factor
                    const last = (item.lastPrice ?? 0) * factor
                    const pmin = (item.minPrice ?? 0) * factor
                    const pmax = (item.maxPrice ?? 0) * factor

                    return (
                      <TableRow key={item._id} className='hover:bg-muted/50'>
                        <TableCell className='font-mono text-xs py-0'>
                          <Link
                            href={`/admin/management/inventory/stock/details/${item._id}`}
                            className='underline hover:text-primary'
                          >
                            {item.productCode || '-'}
                          </Link>
                        </TableCell>
                        <TableCell className='font-medium py-0'>
                          <Link
                            href={`/admin/management/inventory/stock/details/${item._id}`}
                            className='hover:underline block truncate max-w-[250px]'
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell className='text-right text-muted-foreground py-0'>
                          {formatCurrency(avg)}
                        </TableCell>
                        <TableCell className='text-right text-yellow-600 dark:text-yellow-500 py-0'>
                          {formatCurrency(last)}
                        </TableCell>
                        <TableCell className='text-right text-red-500 py-0'>
                          {formatCurrency(pmin)}
                        </TableCell>
                        <TableCell className='text-right text-green-500 py-0'>
                          {formatCurrency(pmax)}
                        </TableCell>
                        <TableCell className='text-right font-semibold py-0'>
                          {convertedTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className='text-right text-orange-500 py-0'>
                          {convertedReserved.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold text-lg py-0 ${item.availableStock >= 0 ? 'text-green-600' : 'text-destructive'}`}
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
                            <SelectTrigger className='h-7 w-full text-xs'>
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

          {/* Footer Paginare */}
          <div className='flex justify-between items-center pt-2 mt-2 border-t'>
            <div className='text-sm text-muted-foreground'>
              Pagina {page} din {totalPages}
            </div>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className='h-4 w-4 mr-1' />
                Anterior
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
