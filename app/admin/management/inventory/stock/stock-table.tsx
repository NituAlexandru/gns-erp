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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' // Importăm Card
import { getAggregatedStockStatus } from '@/lib/db/modules/inventory/inventory.actions'
import { AggregatedStockItem } from '@/lib/db/modules/inventory/types'
import { formatCurrency } from '@/lib/utils'
import { StockSearchFilter } from '@/components/inventory/stock-search-filter'

interface StockTableProps {
  initialStockData: AggregatedStockItem[]
}

export function StockTable({ initialStockData }: StockTableProps) {
  const [stockData, setStockData] =
    useState<AggregatedStockItem[]>(initialStockData)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchStock = useCallback(async (query: string) => {
    setLoading(true)
    const data = await getAggregatedStockStatus(query)
    setStockData(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStock(searchQuery)
  }, [searchQuery, fetchStock])

  const maxUnits = stockData.reduce(
    (max, item) => Math.max(max, 1 + (item.packagingOptions?.length || 0)),
    0
  )

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Stare Stocuri</CardTitle>
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
                  {[...Array(maxUnits)].map((_, index) => (
                    <TableHead key={`head-um-${index}`} className='text-right'>
                      Cantitate
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockData.map((item) => {
                  const allUnits = [
                    { unitName: item.unit, baseUnitEquivalent: 1 },
                    ...(item.packagingOptions || []),
                  ]
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
                        {formatCurrency(item.averageCost ?? 0)}
                      </TableCell>
                      <TableCell className='text-right text-yellow-500'>
                        {formatCurrency(item.lastPrice ?? 0)}
                      </TableCell>
                      <TableCell className='text-right text-red-500'>
                        {formatCurrency(item.minPrice ?? 0)}
                      </TableCell>
                      <TableCell className='text-right text-green-500'>
                        {formatCurrency(item.maxPrice ?? 0)}
                      </TableCell>
                      {[...Array(maxUnits)].map((_, index) => {
                        const unitInfo = allUnits[index]
                        if (unitInfo) {
                          const convertedQuantity =
                            item.totalStock / unitInfo.baseUnitEquivalent
                          return (
                            <TableCell
                              key={unitInfo.unitName}
                              className='text-right font-bold'
                            >
                              {`${convertedQuantity.toFixed(2)} ${unitInfo.unitName}`}
                            </TableCell>
                          )
                        }
                        return (
                          <TableCell
                            key={`cell-um-${index}`}
                            className='text-right'
                          >
                            -
                          </TableCell>
                        )
                      })}
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
