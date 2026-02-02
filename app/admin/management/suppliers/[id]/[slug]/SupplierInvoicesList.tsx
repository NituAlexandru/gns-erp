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
import { formatCurrency } from '@/lib/utils'
import { SupplierInvoiceStatusBadge } from './SupplierInvoiceStatusBadge'
import { SupplierInvoiceListItem } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'

interface SupplierInvoicesListProps {
  supplierId: string
  initialData: {
    data: SupplierInvoiceListItem[]
    totalPages: number
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

  const invoices = initialData?.data || []
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
                <TableRow key={inv._id}>
                  <TableCell className='font-medium uppercase'>
                    {inv.invoiceSeries} - {inv.invoiceNumber}
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
