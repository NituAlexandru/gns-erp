'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { SupplierInvoiceStatusBadge } from './SupplierInvoiceStatusBadge'
import { SupplierInvoiceListItem } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

// Lista de facturi pentru furnizor (individual)

interface SupplierInvoicesListProps {
  supplierId: string
  initialData: {
    data: SupplierInvoiceListItem[]
    totalPages: number
    totalSum?: number
  }
  currentPage: number
}

export function SupplierInvoicesList({
  supplierId,
  initialData,
  currentPage,
}: SupplierInvoicesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  const invoices = initialData?.data || []
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
    <div className='flex flex-col flex-1 gap-4 min-h-[calc(100vh-30rem)] w-full h-full'>
      <div className='flex-1 border rounded-lg overflow-x-auto bg-card flex flex-col'>
        <div className='flex gap-2 items-center justify-between px-2'>
          <span className='text-sm font-bold text-muted-foreground uppercase'>
            Total Sume Facturi:
          </span>
          <span className='text-lg font-bold text-primary'>
            {formatCurrency(totalSum)}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Serie & Număr</TableHead>
              <TableHead>Tip Factură</TableHead>
              <TableHead>Data Facturii</TableHead>
              <TableHead>Scadență</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Total (RON)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell className='font-medium uppercase'>
                    {inv.invoiceSeries} - {inv.invoiceNumber}
                  </TableCell>
                  <TableCell className='text-xs font-semibold'>
                    <span
                      className={
                        inv.invoiceType === 'STORNO'
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                      }
                    >
                      {inv.invoiceType || 'STANDARD'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(inv.invoiceDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    {new Date(inv.dueDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    <SupplierInvoiceStatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${inv.invoiceType === 'STORNO' ? 'text-red-500' : ''}`}
                  >
                    {formatCurrency(
                      inv.invoiceType === 'STORNO'
                        ? -inv.totals.grandTotal
                        : inv.totals.grandTotal,
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Nicio factură găsită.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
