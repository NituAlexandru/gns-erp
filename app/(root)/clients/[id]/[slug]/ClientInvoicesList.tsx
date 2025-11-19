'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  getInvoicesForClient,
  ClientInvoiceListItem,
} from '@/lib/db/modules/financial/invoices/client-invoice.actions'
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
}

export function ClientInvoicesList({ clientId }: ClientInvoicesListProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<ClientInvoiceListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    const fetchInvoices = () => {
      startTransition(async () => {
        try {
          const result = await getInvoicesForClient(
            clientId,
            page,
            statusFilter
          )
          setInvoices(result.data || [])
          setTotalPages(result.totalPages || 0)
        } catch (error) {
          console.error('Failed to fetch client invoices:', error)
          setInvoices([])
          setTotalPages(0)
        }
      })
    }
    fetchInvoices()
  }, [clientId, page, statusFilter])

  const handleRowClick = (invoiceId: string) => {
    router.push(`/financial/invoices/${invoiceId}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex justify-end'>
        <div className=' p-0'>
          <Select value={statusFilter} onValueChange={handleFilterChange}>
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
                <TableCell colSpan={6} className='text-center h-24'>
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
                <TableCell colSpan={6} className='text-center h-24'>
                  Nicio factură găsită pentru acest client.
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
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
