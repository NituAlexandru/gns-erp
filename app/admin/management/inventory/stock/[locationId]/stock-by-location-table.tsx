'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { getStockByLocation } from '@/lib/db/modules/inventory/inventory.actions.read'
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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Truck,
} from 'lucide-react'
import { AddInitialStockDialog } from '../add-initial-stock-dialog'
import { Input } from '@/components/ui/input'

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const page = Number(searchParams.get('page')) || 1
  const [stockData, setStockData] = useState<AggregatedStockItem[]>([])
  const [totals, setTotals] = useState({ totalValue: 0 })
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [jumpInputValue, setJumpInputValue] = useState(page.toString())

  useEffect(() => {
    setJumpInputValue(page.toString())
  }, [page])

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== page
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(page.toString())
    }
  }
  const [selectedUnits, setSelectedUnits] = useState<{ [key: string]: string }>(
    () => {
      if (typeof window === 'undefined') return {}
      try {
        const saved = window.localStorage.getItem('stockUnitPreferences')
        return saved ? JSON.parse(saved) : {}
      } catch {
        return {}
      }
    },
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'stockUnitPreferences',
        JSON.stringify(selectedUnits),
      )
    }
  }, [selectedUnits])

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams],
  )

  const fetchStock = useCallback(async () => {
    setLoading(true)
    const res = await getStockByLocation(locationId, searchQuery, page)
    setStockData(res.data)
    setTotalPages(res.totalPages || 1)
    setTotalDocs(res.totalDocs || 0)
    setTotals(res.totals || { totalValue: 0 })

    setSelectedUnits((prev) => {
      const updatedUnits = { ...prev }
      res.data.forEach((item: AggregatedStockItem) => {
        let exactSacName = null
        if (item.unit.toLowerCase() === 'sac') {
          exactSacName = item.unit
        } else {
          const packSac = item.packagingOptions?.find(
            (p) => p.unitName.toLowerCase() === 'sac',
          )
          if (packSac) exactSacName = packSac.unitName
        }

        if (exactSacName) {
          updatedUnits[item._id] = exactSacName
        }
      })
      return updatedUnits
    })

    setLoading(false)
  }, [locationId, searchQuery, page])

  useEffect(() => {
    fetchStock()
  }, [fetchStock])

  const handleSearchChange = (query: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // Reset page
    router.replace(`${pathname}?${params.toString()}`)
  }

  const handlePageChange = (newPage: number) => {
    const queryString = createQueryString('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${queryString}`)
    })
  }

  const handleUnitChange = (itemId: string, newUnit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [itemId]: newUnit }))
  }

  return (
    <div className='h-[calc(100vh-7rem)] flex flex-col border p-4 rounded-2xl'>
      <div className='flex justify-between items-center mb-2'>
        <div className='flex flex-col'>
          <h3 className='font-bold pt-1'>Stoc: {locationName}</h3>
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
        <div className='flex gap-2'>
          <AddInitialStockDialog onSuccess={fetchStock}>
            <Button variant='outline'>
              <Truck className='mr-2 h-4 w-4' />
              Adaugă Stoc Inițial
            </Button>
          </AddInitialStockDialog>
          <div className='w-[400px]'>
            <StockSearchFilter
              onSearchChange={handleSearchChange}
              defaultValue={searchQuery}
            />
          </div>
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
                  {/* HEADER STYLING MATCHED: text-[10px] pe mic, text-sm/p-4 pe 2xl */}
                  <TableHead className='text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Cod Produs
                  </TableHead>
                  <TableHead className='text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Nume Produs
                  </TableHead>
                  <TableHead className='text-right text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Preț Mediu
                  </TableHead>
                  <TableHead className='text-right text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Ultimul Preț
                  </TableHead>
                  <TableHead className='text-right text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Preț Min
                  </TableHead>
                  <TableHead className='text-right text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Preț Max
                  </TableHead>
                  <TableHead className='text-right font-bold text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Stoc Total
                  </TableHead>
                  <TableHead className='text-right text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Rezervat
                  </TableHead>
                  <TableHead className='text-right font-bold text-green-600 text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12'>
                    Disponibil
                  </TableHead>
                  <TableHead className='w-[90px] text-center text-[10px] px-1 h-8 2xl:text-sm 2xl:p-4 2xl:h-12 2xl:w-[120px]'>
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
                    const factor = selectedConversion?.baseUnitEquivalent ?? 1

                    const convertedTotal = item.totalStock / factor
                    const convertedReserved = item.totalReserved / factor
                    const convertedAvailable = item.availableStock / factor
                    const avg = (item.averageCost ?? 0) * factor
                    const last = (item.lastPrice ?? 0) * factor
                    const pmin = (item.minPrice ?? 0) * factor
                    const pmax = (item.maxPrice ?? 0) * factor

                    return (
                      <TableRow
                        key={item._id}
                        className='hover:bg-muted/50 border-b'
                      >
                        {/* COD PRODUS */}
                        <TableCell className='font-mono text-[10px] py-0 px-1 h-8 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          <Link
                            href={`/admin/management/inventory/stock/details/${item._id}`}
                            className='underline hover:text-primary'
                          >
                            {item.productCode || '-'}
                          </Link>
                        </TableCell>

                        {/* NUME PRODUS */}
                        <TableCell className='text-[10px] py-0 px-1 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          <Link
                            href={`/admin/management/inventory/stock/details/${item._id}`}
                            className='hover:underline block truncate max-w-[120px] lg:max-w-[200px] 2xl:max-w-[350px]'
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                        </TableCell>

                        {/* PRETURI */}
                        <TableCell className='text-right text-muted-foreground text-[10px] py-0 px-1 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          {formatCurrency(avg)}
                        </TableCell>
                        <TableCell className='text-right text-yellow-600 dark:text-yellow-500 text-[10px] py-0 px-1 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          {formatCurrency(last)}
                        </TableCell>
                        <TableCell className='text-right text-red-500 text-[10px] py-0 px-1 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          {formatCurrency(pmin)}
                        </TableCell>
                        <TableCell className='text-right text-green-500 text-[10px] py-0 px-1 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          {formatCurrency(pmax)}
                        </TableCell>

                        {/* STOCURI */}
                        <TableCell className='text-right font-semibold text-[10px] py-0 px-1 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          {convertedTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className='text-right text-orange-500 text-[10px] py-0 px-1 lg:text-xs 2xl:text-sm 2xl:py-0 2xl:px-2'>
                          {convertedReserved.toFixed(2)}
                        </TableCell>

                        {/* DISPONIBIL - Stil identic cu StockTable */}
                        <TableCell
                          className={`text-right font-bold py-0 px-1 text-xs 2xl:text-base 2xl:py-0 2xl:px-1 ${item.availableStock >= 0 ? 'text-green-600' : 'text-destructive'}`}
                        >
                          {convertedAvailable.toFixed(2)}
                        </TableCell>

                        {/* SELECTOR UM */}
                        <TableCell className='py-0 px-1 2xl:py-0 2xl:px-2'>
                          <Select
                            value={selectedUnitName}
                            onValueChange={(newUnit) =>
                              handleUnitChange(item._id, newUnit)
                            }
                          >
                            <SelectTrigger className='h-6 text-[10px] px-1 w-full lg:h-7 lg:text-xs 2xl:h-7 2xl:text-xs 2xl:py-[-1px]'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allUnits.map((u) => (
                                <SelectItem
                                  key={u.unitName}
                                  value={u.unitName}
                                  className='text-xs'
                                >
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

          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-2 py-1 mt-auto border-t bg-background shrink-0 pt-3'>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={() => handlePageChange(1)}
                disabled={page <= 1 || isPending || loading}
                title='Prima pagină'
              >
                <ChevronsLeft className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                size='sm'
                className='h-8'
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isPending || loading}
              >
                {isPending || loading ? (
                  <Loader2 className='h-4 w-4 animate-spin mr-1' />
                ) : (
                  <ChevronLeft className='h-4 w-4 mr-1' />
                )}
                Anterior
              </Button>
              <div className='flex items-center gap-2 text-sm text-muted-foreground mx-2'>
                <span>Pagina</span>
                <Input
                  value={jumpInputValue}
                  onChange={(e) => setJumpInputValue(e.target.value)}
                  onBlur={handleJump}
                  onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                  className='w-10 h-8 text-center px-1'
                  disabled={isPending || loading}
                />
                <span>din {totalPages}</span>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='h-8'
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || isPending || loading}
              >
                Următor
                {isPending || loading ? (
                  <Loader2 className='h-4 w-4 animate-spin ml-1' />
                ) : (
                  <ChevronRight className='h-4 w-4 ml-1' />
                )}
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='h-8 w-8'
                onClick={() => handlePageChange(totalPages)}
                disabled={page >= totalPages || isPending || loading}
                title='Ultima pagină'
              >
                <ChevronsRight className='h-4 w-4' />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
