'use client'

import { useTransition } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('status', value)
    params.set('page', '1')
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex justify-end'>
        <div className='p-0'>
          <Select value={currentStatus} onValueChange={handleFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder='Filtrează status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>Toate Facturile</SelectItem>
              <SelectItem value='UNPAID'>De Plată (Neachitate)</SelectItem>
              <SelectItem value='PAID'>Plătite</SelectItem>
              <SelectItem value='APPROVED'>Aprobate</SelectItem>
              <SelectItem value='CANCELLED'>Anulate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className='border rounded-lg overflow-x-auto bg-card'>
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
