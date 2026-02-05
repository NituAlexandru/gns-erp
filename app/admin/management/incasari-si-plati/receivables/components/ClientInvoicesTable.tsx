'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Loader2 } from 'lucide-react'
import { formatCurrency, formatDateTime, toSlug } from '@/lib/utils'
import { INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/invoices/invoice.constants'
import { RECEIVABLES_PAGE_SIZE } from '@/lib/constants'
import { createCompensationPayment } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { toast } from 'sonner'

// Tipul datelor returnate de funcția getAllUnpaidInvoices
interface UnpaidInvoiceItem {
  _id: string
  seriesName: string
  invoiceNumber: string
  invoiceDate: string // sau Date, depinde cum vine din server action (de obicei string prin JSON)
  dueDate: string
  status: keyof typeof INVOICE_STATUS_MAP
  remainingAmount: number
  totals: {
    grandTotal: number
  }
  clientId: {
    _id: string
    name: string
  }
  invoiceType: string
}

interface ClientInvoicesTableProps {
  data: {
    data: UnpaidInvoiceItem[]
    pagination: {
      total: number
      page: number
      totalPages: number
    }
  }
  onOpenCreatePayment: (
    clientId: string,
    clientName: string,
    invoiceId?: string,
  ) => void
  onViewInvoice: (invoiceId: string) => void
  currentUser?: { id: string; name?: string | null }
}

export function ClientInvoicesTable({
  data,
  onOpenCreatePayment,
  onViewInvoice,
  currentUser,
}: ClientInvoicesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentPage = Number(searchParams.get('page')) || 1
  const [isPending, setIsPending] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleCompensate = async (invoice: UnpaidInvoiceItem) => {
    if (!currentUser?.id) {
      toast.error('Eroare: Utilizator neidentificat.')
      return
    }

    setProcessingId(invoice._id)
    try {
      const result = await createCompensationPayment(
        invoice._id,
        currentUser.id,
        currentUser.name || 'Operator',
      )

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setProcessingId(null)
    }
  }

  // Funcție schimbare pagină
  const handlePageChange = (newPage: number) => {
    setIsPending(true)
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
    setIsPending(false)
  }

  // Verificare dacă e factură nouă (ultimele 24h) - opțional
  const isNew = (dateInput?: string | Date) => {
    if (!dateInput) return false
    const createdTime = new Date(dateInput).getTime()
    const currentTime = new Date().getTime()
    return currentTime - createdTime < 24 * 60 * 60 * 1000
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative '>
        <table className='w-full caption-bottom text-sm text-left'>
          <TableHeader className='sticky top-0 z-10 bg-muted/50 shadow-sm backdrop-blur-sm'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-[50px] py-1'>#</TableHead>
              <TableHead className='py-1'>Serie / Număr</TableHead>
              <TableHead className='py-1'>Client</TableHead>
              <TableHead className='py-1'>Data Facturii</TableHead>
              <TableHead className='py-1'>Scadența</TableHead>
              <TableHead className='py-1'>Status</TableHead>
              <TableHead className='text-right py-1'>Total Factură</TableHead>
              <TableHead className='text-right py-1'>Rest de Încasat</TableHead>
              <TableHead className='w-[50px] py-1'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className='h-32 text-center text-muted-foreground'
                >
                  Nu există facturi neîncasate conform filtrelor.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((inv, index) => {
                const globalIndex =
                  (currentPage - 1) * RECEIVABLES_PAGE_SIZE + index + 1
                const isOverdue =
                  new Date(inv.dueDate) < new Date() && inv.remainingAmount > 0
                const statusInfo = INVOICE_STATUS_MAP[inv.status] || {
                  name: inv.status,
                  variant: 'secondary',
                }

                // Determinăm dacă e factură de storno/negativă
                const isNegative = inv.totals.grandTotal < 0

                return (
                  <TableRow
                    key={inv._id}
                    className='hover:bg-muted/30 group transition-colors'
                  >
                    <TableCell className='font-medium text-muted-foreground py-1'>
                      {globalIndex}
                    </TableCell>

                    <TableCell className='py-1'>
                      <div className='flex items-center gap-2'>
                        <span
                          className='font-semibold text-foreground uppercase cursor-pointer hover:underline hover:text-primary transition-colors'
                          onClick={() => onViewInvoice(inv._id)}
                          title='Vezi Detalii Factură'
                        >
                          {inv.seriesName} - {inv.invoiceNumber}
                        </span>
                        {isNew(inv.invoiceDate) && (
                          <Badge
                            variant='success'
                            className='h-4 px-1 text-[10px] flex items-center justify-center'
                          >
                            NOU
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className='py-1 font-medium'>
                      {inv.clientId ? (
                        <span
                          className='cursor-pointer hover:underline hover:text-primary transition-colors'
                          onClick={() => {
                            router.push(
                              `/clients/${inv.clientId._id}/${toSlug(
                                inv.clientId.name,
                              )}?tab=payments`,
                            )
                          }}
                        >
                          {inv.clientId.name}
                        </span>
                      ) : (
                        'Client Necunoscut'
                      )}
                    </TableCell>

                    <TableCell className='py-1 text-muted-foreground'>
                      {formatDateTime(new Date(inv.invoiceDate)).dateOnly}
                    </TableCell>

                    <TableCell className='py-1'>
                      <span
                        className={
                          isOverdue
                            ? 'text-red-600 font-bold'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatDateTime(new Date(inv.dueDate)).dateOnly}
                      </span>
                    </TableCell>

                    <TableCell className='py-1'>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>

                    <TableCell className='text-right py-1 text-muted-foreground'>
                      {formatCurrency(inv.totals.grandTotal)}
                    </TableCell>

                    <TableCell className='text-right font-bold py-1'>
                      <span
                        className={
                          isNegative ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {formatCurrency(inv.remainingAmount)}
                      </span>
                    </TableCell>

                    <TableCell className='py-1'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            className='h-8 w-8 p-0 transition-opacity'
                          >
                            <span className='sr-only'>Deschide meniu</span>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {/* 1. Modificat: Folosește onViewInvoice și schimbat textul */}
                          <DropdownMenuItem
                            onClick={() => onViewInvoice(inv._id)}
                            className='cursor-pointer'
                          >
                            Vezi Detalii
                          </DropdownMenuItem>

                          {isNegative ? (
                            <DropdownMenuItem
                              onClick={() => handleCompensate(inv)}
                              disabled={processingId === inv._id}
                              className='text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer'
                            >
                              {processingId === inv._id ? (
                                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                              ) : null}
                              Generează Compensare
                            </DropdownMenuItem>
                          ) : (
                            /* Altfel -> Arătăm Încasare Normală */
                            <DropdownMenuItem
                              className='cursor-pointer font-medium'
                              onClick={() =>
                                onOpenCreatePayment(
                                  inv.clientId._id,
                                  inv.clientId.name,
                                  inv._id,
                                )
                              }
                            >
                              Adaugă Încasare
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
        </table>
      </div>

      {/* Paginare */}
      {data.pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-3 border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Anterior'
            )}
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {currentPage} din {data.pagination.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= data.pagination.totalPages || isPending}
          >
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Următor'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
