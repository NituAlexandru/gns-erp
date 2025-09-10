'use client'

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { getStockMovements } from '@/lib/db/modules/inventory/inventory.actions'
import { format, subDays } from 'date-fns'
import { ro } from 'date-fns/locale'
import { PopulatedStockMovement } from '@/lib/db/modules/inventory/types'
import {
  LOCATION_NAMES_MAP,
  MOVEMENT_TYPE_DETAILS_MAP,
  IN_TYPES,
} from '@/lib/db/modules/inventory/constants'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { MovementsFilters, MovementsFiltersState } from './movements-filters'

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<PopulatedStockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<MovementsFiltersState>({
    q: '',
    location: 'ALL',
    type: 'ALL',
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
  })

  // Funcție memoizată pentru a apela API-ul cu filtre
  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const filteredMovements = await getStockMovements(filters)
      setMovements(filteredMovements)
    } catch (error) {
      console.error('Failed to fetch stock movements:', error)
      setMovements([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  return (
    <div className='h-[calc(100vh-7rem)] flex flex-col border-1 p-6 rounded-2xl'>
      <div className='flex justify-between'>
        <h3 className='font-bold pt-1'>Mișcări Stoc (Jurnal)</h3>
        <MovementsFilters initialState={filters} onFilterChange={setFilters} />
      </div>
      {loading ? (
        <div className='flex items-center justify-center h-full'>
          <p>Se încarcă mișcările de stoc...</p>
        </div>
      ) : (
        <Table>
          <TableHeader className='sticky top-0 bg-card z-10'>
            <TableRow>
              <TableHead>Dată</TableHead>
              <TableHead>Tip (IN/OUT)</TableHead>
              <TableHead>Detalii Mișcare</TableHead>
              <TableHead>Nume Produs/Ambalaj</TableHead>
              <TableHead>Furnizor/Client</TableHead>
              <TableHead className='text-right'>Cantitate</TableHead>
              <TableHead>UM</TableHead>
              <TableHead>Locație</TableHead>
              <TableHead>Utilizator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => {
              const locationId = movement.locationFrom || movement.locationTo
              const locationName = locationId
                ? LOCATION_NAMES_MAP[locationId]
                : '-'
              const isMovementIn = IN_TYPES.has(movement.movementType)
              const movementTypeName =
                MOVEMENT_TYPE_DETAILS_MAP[movement.movementType]?.name ||
                movement.movementType
              let partnerName = '-'
              if (movement.note?.includes('de la furnizor')) {
                partnerName =
                  movement.note.split('de la furnizor')[1]?.trim() || '-'
              }

              return (
                <TableRow key={movement._id}>
                  <TableCell>
                    {movement.timestamp
                      ? format(
                          new Date(movement.timestamp),
                          'dd/MM/yyyy HH:mm',
                          { locale: ro }
                        )
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-bold',
                        isMovementIn ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {isMovementIn ? 'INTRARE' : 'IEȘIRE'}
                    </span>
                  </TableCell>
                  <TableCell>{movementTypeName}</TableCell>
                  <TableCell className='font-medium'>
                    {movement.stockableItem?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{partnerName}</TableCell>
                  <TableCell className='text-right font-bold'>
                    {movement.quantity.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {(movement.unitMeasure === 'bucata'
                      ? 'buc'
                      : movement.unitMeasure) || '-'}
                  </TableCell>
                  <TableCell>{locationName}</TableCell>
                  <TableCell>{movement.responsibleUser?.name || '-'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
