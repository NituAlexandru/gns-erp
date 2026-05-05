'use client'

import React, { useEffect, useState, useTransition } from 'react'
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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

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
    totalSum?: number
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
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())
  const receptions = initialData?.data || []
  const totalPages = initialData?.totalPages || 0
  const totalSum = initialData?.totalSum || 0

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // Funcția pentru jump to page
  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== currentPage
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(currentPage.toString())
    }
  }

  return (
    <div className='flex flex-col gap-4 flex-1 min-h-[calc(100vh-30rem)] w-full'>
      <div className='flex-1 border rounded-lg overflow-x-auto bg-card'>
        <div className='flex items-center justify-between px-1'>
          <span className='text-xs font-bold text-muted-foreground uppercase'>
            Total Sume Recepții:
          </span>
          <span className='text-lg font-bold text-primary'>
            {formatCurrency(totalSum)}
          </span>
        </div>
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
        <div className='flex items-center justify-center gap-2 py-1 mt-auto border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            {isPending ? (
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
              disabled={isPending}
            />
            <span>din {totalPages}</span>
          </div>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
            {isPending ? (
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
            disabled={currentPage >= totalPages || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </div>
  )
}
