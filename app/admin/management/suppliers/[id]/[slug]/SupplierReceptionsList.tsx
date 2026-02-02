'use client'

import React, { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
import { LOCATION_NAMES_MAP } from '@/lib/db/modules/inventory/constants'
import { InventoryLocation } from '@/lib/db/modules/inventory/types'

interface ReceptionListItem {
  _id: string
  series: string
  number: string
  date: Date
  invoiceReference: string
  warehouseName: string
  totalValue: number
}

interface SupplierReceptionsListProps {
  supplierId: string
  initialData: {
    data: ReceptionListItem[]
    totalPages: number
  }
  currentPage: number
}

export function SupplierReceptionsList({
  supplierId,
  initialData,
  currentPage,
}: SupplierReceptionsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Folosim datele primite, nu facem fetch
  const receptions = initialData?.data || []
  const totalPages = initialData?.totalPages || 0

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

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

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
