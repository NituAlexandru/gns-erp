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
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react' // Scos AlertCircle nefolosit
import {
  getSupplierInvoices,
  SupplierInvoiceListItem,
} from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { SUPPLIER_INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PAGE_SIZE } from '@/lib/constants'

interface SupplierInvoicesTableProps {
  initialData: {
    data: SupplierInvoiceListItem[]
    totalPages: number
    total: number
  }
  onOpenCreatePayment: (supplierId: string) => void
  onOpenDetailsSheet: (invoiceId: string) => void
}

export function SupplierInvoicesTable({
  initialData,
  onOpenCreatePayment,
  onOpenDetailsSheet,
}: SupplierInvoicesTableProps) {
  const [invoices, setInvoices] = useState<SupplierInvoiceListItem[]>(
    initialData.data
  )
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const isNew = (dateInput?: string | Date) => {
    if (!dateInput) return false

    const createdTime = new Date(dateInput).getTime()
    const currentTime = new Date().getTime()

    // Definim fereastra de timp pentru "NOU" (24 ore în milisecunde)
    const timeWindow = 24 * 60 * 60 * 1000

    // Este nou dacă diferența dintre ACUM și CREARE este mai mică de 24h
    return currentTime - createdTime < timeWindow
  }

  // Fix useEffect deps: scoatem 'invoices' din deps, lăsăm doar page
  useEffect(() => {
    if (page === 1) return

    startTransition(async () => {
      // 2. MODIFICĂ AICI (înlocuiește 20 cu PAGE_SIZE)
      const result = await getSupplierInvoices(page, PAGE_SIZE)

      if (result.success) {
        setInvoices(result.data)
        setTotalPages(result.totalPages)
      }
    })
  }, [page])

  return (
    // 1. Containerul principal ocupă tot spațiul (h-full) și e flex vertical
    <div className='flex flex-col h-full'>
      {/* 2. Wrapper-ul tabelului ocupă spațiul rămas (flex-1) și are scroll (overflow-auto) */}
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative'>
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
            <TableRow className='bg-muted/50 hover:bg-muted/50'>
              <TableHead className='w-[50px]'>#</TableHead>
              <TableHead>Serie / Număr</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Data Facturii</TableHead>
              <TableHead>Scadența</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Total</TableHead>
              <TableHead className='w-[50px]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={8} className='h-24 text-center'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='h-24 text-center text-muted-foreground'
                >
                  Nu există facturi.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv, index) => {
                const showNewBadge = isNew(inv.createdAt || inv.invoiceDate)

                return (
                  <TableRow key={inv._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium text-muted-foreground'>
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </TableCell>

                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>
                          {inv.invoiceSeries} {inv.invoiceNumber}
                        </span>
                        {showNewBadge && (
                          <Badge
                            variant='success'
                            className='h-4 px-1.5 text-[10px] font-bold flex items-center justify-center leading-none'
                          >
                            NOU
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {inv.supplierId?.name || 'Furnizor Necunoscut'}
                    </TableCell>

                    <TableCell>
                      {formatDateTime(new Date(inv.invoiceDate)).dateOnly}
                    </TableCell>

                    <TableCell>
                      <span
                        className={
                          new Date(inv.dueDate) < new Date() &&
                          inv.status !== 'PLATITA'
                            ? 'text-red-600 font-medium'
                            : ''
                        }
                      >
                        {formatDateTime(new Date(inv.dueDate)).dateOnly}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          SUPPLIER_INVOICE_STATUS_MAP[inv.status]?.variant ||
                          'outline'
                        }
                      >
                        {SUPPLIER_INVOICE_STATUS_MAP[inv.status]?.name}
                      </Badge>
                    </TableCell>

                    <TableCell className='text-right font-medium'>
                      {formatCurrency(inv.totals.grandTotal)}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => onOpenDetailsSheet(inv._id)}
                          >
                            Vezi Detalii
                          </DropdownMenuItem>

                          {inv.status !== 'PLATITA' && (
                            <DropdownMenuItem
                              onClick={() =>
                                inv.supplierId &&
                                onOpenCreatePayment(inv.supplierId._id)
                              }
                            >
                              Înregistrează Plată
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-4 border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {page} din {totalPages || 1}
          </span>
          <Button
            variant='outline'
            size='sm'
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
