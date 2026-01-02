'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { getReceptionsForSupplier } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { InventoryLocation } from '@/lib/db/modules/inventory/types'

interface SupplierReceptionsListProps {
  supplierId: string
}

export function SupplierReceptionsList({
  supplierId,
}: SupplierReceptionsListProps) {
  const [receptions, setReceptions] = useState<any[]>([]) // Poți înlocui any cu interfața ReceptionListItem
  const [totalPages, setTotalPages] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchData = () => {
      startTransition(async () => {
        try {
          const result = await getReceptionsForSupplier(supplierId, page)
          setReceptions(result.data || [])
          setTotalPages(result.totalPages || 0)
        } catch (error) {
          console.error('Failed to fetch supplier receptions:', error)
        }
      })
    }
    fetchData()
  }, [supplierId, page])

  return (
    <div className='flex flex-col gap-4'>
      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Număr NIR</TableHead>
              <TableHead>Data Recepției</TableHead>
              <TableHead>Factura Referință</TableHead>
              <TableHead>Gestiune</TableHead>
              <TableHead className='text-right'>Valoare (RON)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Se încarcă recepțiile...
                </TableCell>
              </TableRow>
            ) : receptions.length > 0 ? (
              receptions.map((nir) => (
                <TableRow key={nir._id}>
                  <TableCell className='font-medium uppercase'>
                    {nir.series} - {nir.number}
                  </TableCell>
                  <TableCell>
                    {new Date(nir.date).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell className='uppercase'>
                    {nir.invoiceReference || '-'}
                  </TableCell>
                  <TableCell>
                    {LOCATION_NAMES_MAP[nir.warehouseName as InventoryLocation]}
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(nir.totalValue || 0)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Nu există recepții înregistrate.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare - Identică cu cea de la facturi */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
