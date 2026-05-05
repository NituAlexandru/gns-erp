'use client'

import { useEffect, useState } from 'react'
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
import {
  MoreHorizontal,
  Loader2,
  ChevronRight,
  ChevronsRight,
  ChevronLeft,
  ChevronsLeft,
} from 'lucide-react'
import { formatCurrency, formatDateTime, toSlug } from '@/lib/utils'
import { INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/invoices/invoice.constants'
import { RECEIVABLES_PAGE_SIZE } from '@/lib/constants'
import { createCompensationPayment } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

interface UnpaidInvoiceItem {
  _id: string
  seriesName: string
  invoiceNumber: string
  invoiceDate: string
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
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

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

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    const maxPage = data.pagination.totalPages

    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= maxPage &&
      pageNum !== currentPage
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(currentPage.toString())
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
    <div className='flex flex-col w-full gap-2'>
      <div className='rounded-md border overflow-x-auto bg-card'>
        <table className='w-full caption-bottom text-sm text-left'>
          <TableHeader className='sticky top-0 z-10 bg-muted/50 shadow-sm backdrop-blur-sm'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-[50px] py-0.5'>#</TableHead>
              <TableHead className='py-0.5'>Serie / Număr</TableHead>
              <TableHead className='py-0.5'>Client</TableHead>
              <TableHead className='py-0.5'>Data Facturii</TableHead>
              <TableHead className='py-0.5'>Scadența</TableHead>
              <TableHead className='py-0.5'>Status</TableHead>
              <TableHead className='text-right py-0.5'>Total Factură</TableHead>
              <TableHead className='text-right py-0.5'>
                Rest de Încasat
              </TableHead>
              <TableHead className='w-[50px] py-0.5'></TableHead>
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
                    <TableCell className='font-medium text-muted-foreground py-0.5'>
                      {globalIndex}
                    </TableCell>

                    <TableCell className='py-0.5'>
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
                            className='h-4 px-1 pt-1 text-[10px] flex items-center justify-center'
                          >
                            NOU
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className='py-0.5 font-medium'>
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

                    <TableCell className='py-0.5 text-muted-foreground'>
                      {formatDateTime(new Date(inv.invoiceDate)).dateOnly}
                    </TableCell>

                    <TableCell className='py-0.5'>
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

                    <TableCell className='py-0.5'>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>

                    <TableCell className='text-right py-0.5 text-muted-foreground'>
                      {formatCurrency(inv.totals.grandTotal)}
                    </TableCell>

                    <TableCell className='text-right font-bold py-0.5'>
                      <span
                        className={
                          isNegative ? 'text-green-600' : 'text-red-600'
                        }
                      >
                        {formatCurrency(inv.remainingAmount)}
                      </span>
                    </TableCell>

                    <TableCell className='py-0.5'>
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
            <span>din {data.pagination.totalPages}</span>
          </div>

          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= data.pagination.totalPages || isPending}
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
            onClick={() => handlePageChange(data.pagination.totalPages)}
            disabled={currentPage >= data.pagination.totalPages || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </div>
  )
}
