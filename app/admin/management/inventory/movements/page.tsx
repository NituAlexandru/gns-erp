'use client'

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { getStockMovements } from '@/lib/db/modules/inventory/inventory.actions.read'
import { format, subDays } from 'date-fns'
import { ro } from 'date-fns/locale'
import { PopulatedStockMovement } from '@/lib/db/modules/inventory/types'
import {
  LOCATION_NAMES_MAP,
  MOVEMENT_TYPE_DETAILS_MAP,
  IN_TYPES,
} from '@/lib/db/modules/inventory/constants'
import { cn, formatId } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { MovementsFilters, MovementsFiltersState } from './movements-filters'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Extindem tipul de bază doar pentru câmpurile populate simple (parteneri)
type ExtendedStockMovement = PopulatedStockMovement & {
  supplier?: { _id: string; name: string } | null
  client?: { _id: string; name: string } | null
  documentNumber?: string
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<ExtendedStockMovement[]>([])
  const [loading, setLoading] = useState(true)

  // State pentru Paginare
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalDocs, setTotalDocs] = useState(0)

  const [filters, setFilters] = useState<MovementsFiltersState>({
    q: '',
    location: 'ALL',
    type: 'ALL',
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
  })

  const handleFilterChange = useCallback(
    (newFilters: MovementsFiltersState) => {
      setFilters(newFilters)
      setPage(1)
    },
    []
  )

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await getStockMovements(filters, page)

      setMovements(res.data as ExtendedStockMovement[])
      setTotalPages(res.totalPages || 1)
      setTotalDocs(res.totalDocs || 0)
    } catch (error) {
      console.error('Failed to fetch stock movements:', error)
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  return (
    <div className='h-[calc(100vh-7rem)] flex flex-col border-1 p-4 rounded-2xl'>
      <div className='flex justify-between items-center mb-2'>
        <div>
          <h3 className='font-bold pt-1'>Mișcări Stoc (Jurnal)</h3>
          {totalDocs > 0 && (
            <span className='text-xs text-muted-foreground ml-1'>
              ({totalDocs} înregistrări)
            </span>
          )}
        </div>
        <MovementsFilters
          initialState={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
      {loading ? (
        <div className='flex items-center justify-center h-full'>
          <p>Se încarcă mișcările de stoc...</p>
        </div>
      ) : (
        <>
          <div className='overflow-auto flex-1 border rounded-md relative'>
            <Table>
              <TableHeader className='sticky top-0 bg-background z-20 shadow-sm'>
                <TableRow>
                  <TableHead className='w-[100px]'>Referință</TableHead>
                  <TableHead className='w-[140px]'>Dată</TableHead>
                  <TableHead className='w-[100px]'>Tip</TableHead>
                  <TableHead className='w-[150px]'>Detalii</TableHead>
                  <TableHead className='max-w-[200px]'>Produs</TableHead>
                  <TableHead>Partener</TableHead>
                  <TableHead className='text-right'>Cantitate</TableHead>
                  <TableHead>UM</TableHead>
                  <TableHead>Locație</TableHead>
                  <TableHead>Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className='h-24 text-center'>
                      Nu există date.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => {
                    const locationId =
                      movement.locationFrom || movement.locationTo
                    const locationName = locationId
                      ? LOCATION_NAMES_MAP[locationId]
                      : '-'
                    const isMovementIn = IN_TYPES.has(movement.movementType)

                    const movementTypeName =
                      MOVEMENT_TYPE_DETAILS_MAP[movement.movementType]?.name ||
                      movement.movementType

                    let partnerName = '-'
                    if (movement.supplier?.name) {
                      partnerName = movement.supplier.name
                    } else if (movement.client?.name) {
                      partnerName = movement.client.name
                    } else if (movement.note?.includes('de la furnizor')) {
                      partnerName =
                        movement.note.split('de la furnizor')[1]?.trim() || '-'
                    }

                    return (
                      <TableRow key={movement._id}>
                        <TableCell className='font-mono text-xs text-muted-foreground'>
                          <Link
                            href={`/admin/management/inventory/movements/${movement._id}`}
                            className='underline hover:text-primary'
                            title={`Vezi detalii mișcare ${formatId(
                              movement._id
                            )}`}
                          >
                            {movement.documentNumber || formatId(movement._id)}
                          </Link>
                        </TableCell>

                        <TableCell>
                          {movement.timestamp
                            ? format(
                                new Date(movement.timestamp),
                                'dd/MM/yy HH:mm',
                                { locale: ro }
                              )
                            : '-'}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={isMovementIn ? 'outline' : 'default'}
                            className={cn(
                              'font-bold text-[10px]',
                              isMovementIn
                                ? ' border-green-200 bg-green-600'
                                : ''
                            )}
                          >
                            {isMovementIn ? 'INTRARE' : 'IEȘIRE'}
                          </Badge>
                        </TableCell>

                        <TableCell className='text-xs text-muted-foreground'>
                          {movementTypeName}
                        </TableCell>

                        <TableCell className='max-w-[200px]'>
                          <div className='flex items-center gap-1 group relative'>
                            <span
                              className='truncate font-medium block'
                              title={movement.stockableItem?.name}
                            >
                              {movement.stockableItem?.name || 'N/A'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className='text-sm'>{partnerName}</TableCell>

                        <TableCell className='text-right font-bold'>
                          {movement.quantity.toFixed(2)}
                        </TableCell>

                        <TableCell className='text-xs text-muted-foreground'>
                          {movement.unitMeasure || '-'}
                        </TableCell>

                        <TableCell className='text-xs'>
                          {locationName}
                        </TableCell>
                        <TableCell className='text-xs'>
                          {movement.responsibleUser?.name || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer cu Paginare */}
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
