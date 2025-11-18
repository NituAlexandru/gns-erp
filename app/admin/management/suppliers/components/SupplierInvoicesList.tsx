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
  getInvoicesForSupplier,
  SupplierInvoiceListItem,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { formatCurrency } from '@/lib/utils'
import { SupplierInvoiceStatusBadge } from '../[id]/[slug]/SupplierInvoiceStatusBadge'

interface SupplierInvoicesListProps {
  supplierId: string
}

export function SupplierInvoicesList({
  supplierId,
}: SupplierInvoicesListProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<SupplierInvoiceListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchData = () => {
      startTransition(async () => {
        try {
          const result = await getInvoicesForSupplier(supplierId, page)
          setInvoices(result.data || [])
          setTotalPages(result.totalPages || 0)
        } catch (error) {
          console.error('Failed to fetch supplier invoices:', error)
        }
      })
    }
    fetchData()
  }, [supplierId, page])

  const handleRowClick = (id: string) => {
    router.push(`/admin/management/financial/treasury/payables/${id}`)
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Serie & Număr</TableHead>
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
                <TableRow
                  key={inv._id}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleRowClick(inv._id)}
                >
                  <TableCell className='font-medium'>
                    {inv.invoiceSeries} {inv.invoiceNumber}
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
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(inv.totals.grandTotal)}
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
