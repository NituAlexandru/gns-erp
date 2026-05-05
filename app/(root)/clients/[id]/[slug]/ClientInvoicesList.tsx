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
import { ClientInvoiceListItem } from '@/lib/db/modules/financial/invoices/client-invoice.actions'
import { formatCurrency } from '@/lib/utils'
import { InvoiceStatusBadge } from '@/app/(root)/financial/invoices/components/InvoiceStatusBadge'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ClientInvoicesListProps {
  clientId: string
  initialData: {
    data: ClientInvoiceListItem[]
    totalPages: number
  }
  currentPage: number
}

export function ClientInvoicesList({
  clientId,
  initialData,
  currentPage,
}: ClientInvoicesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const invoices = initialData?.data || []
  const totalPages = initialData?.totalPages || 0
  const currentStatus = searchParams.get('status') || 'ALL'
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

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
  const handleRowClick = (invoiceId: string) => {
    router.push(`/financial/invoices/${invoiceId}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className='flex flex-col gap-2 flex-1 min-h-[calc(100vh-30rem)] w-full'>
      <div className='flex-1 border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Nr. Document</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Data Emiterii</TableHead>
              <TableHead>Data Scadenței</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Rest de Plată</TableHead>
              <TableHead className='text-right'>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center h-24'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice._id.toString()}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleRowClick(invoice._id.toString())}
                >
                  <TableCell className='font-medium'>
                    {invoice.seriesName}-{invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{invoice.invoiceType}</TableCell>
                  <TableCell>
                    {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className='text-right font-medium'>
                    {invoice.remainingAmount > 0 ? (
                      <span className='text-red-600'>
                        {formatCurrency(invoice.remainingAmount)}
                      </span>
                    ) : (
                      <span className='text-green-600'>Achitat</span>
                    )}
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(invoice.totals.grandTotal)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className='text-center h-24'>
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
