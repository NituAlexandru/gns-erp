'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
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
import { SupplierInvoiceListItem } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { SUPPLIER_INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.constants'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { createSupplierCompensationPayment } from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'
import { toast } from 'sonner'

interface SupplierInvoicesTableProps {
  data: {
    data: SupplierInvoiceListItem[]
    totalPages: number
    total: number
  }
  onOpenCreatePayment: (supplierId: string, invoiceId?: string) => void
  onOpenDetailsSheet: (invoiceId: string) => void
  currentUser?: { id: string; name?: string | null }
}

export function SupplierInvoicesTable({
  data,
  onOpenCreatePayment,
  onOpenDetailsSheet,
  currentUser,
}: SupplierInvoicesTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Citim pagina curentă din URL (default 1)
  const currentPage = Number(searchParams.get('page')) || 1
  const [isPending, setIsPending] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Funcție pentru schimbarea paginii în URL
  const handlePageChange = (newPage: number) => {
    setIsPending(true)
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
    setIsPending(false)
  }

  const handleCompensate = async (invoice: SupplierInvoiceListItem) => {
    if (!currentUser?.id) {
      toast.error('Eroare: Utilizator neidentificat.')
      return
    }

    setProcessingId(invoice._id)
    try {
      const result = await createSupplierCompensationPayment(
        invoice._id,
        currentUser.id, 
        currentUser.name || 'Operator', 
      )

      if (result.success) {
        toast.success(result.message)
        router.refresh() // Actualizăm lista (factura va dispărea sau va deveni plătită)
      } else {
        toast.error('Eroare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setProcessingId(null)
    }
  }

  const isNew = (dateInput?: string | Date) => {
    if (!dateInput) return false
    const createdTime = new Date(dateInput).getTime()
    const currentTime = new Date().getTime()
    const timeWindow = 24 * 60 * 60 * 1000
    return currentTime - createdTime < timeWindow
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative'>
        <table className='w-full caption-bottom text-sm text-left'>
          <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
            <TableRow className='bg-muted/50 hover:bg-muted/50'>
              <TableHead className='w-[50px] py-1'>#</TableHead>
              <TableHead className='py-1'>Serie / Număr</TableHead>
              <TableHead className='py-1'>Furnizor</TableHead>
              <TableHead className='py-1'>Data Facturii</TableHead>
              <TableHead className='py-1'>Scadența</TableHead>
              <TableHead className='py-1'>Status</TableHead>
              <TableHead className='text-right py-1'>Total</TableHead>
              <TableHead className='w-[50px] py-1'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Nu mai avem loading pe fetch intern, doar pe navigare */}
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='h-24 text-center text-muted-foreground'
                >
                  Nu există facturi conform filtrelor.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((inv, index) => {
                const showNewBadge = isNew(inv.createdAt || inv.invoiceDate)
                const globalIndex =
                  (currentPage - 1) * PAYABLES_PAGE_SIZE + index + 1

                const isCompensatable =
                  inv.remainingAmount < 0 || inv.invoiceType === 'STORNO'
                // -----------------------------------------------------------

                return (
                  <TableRow key={inv._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium text-muted-foreground py-1'>
                      {globalIndex}
                    </TableCell>

                    <TableCell className='py-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium uppercase'>
                          {inv.invoiceSeries} - {inv.invoiceNumber}
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

                    <TableCell className='py-1'>
                      {inv.supplierId?.name || 'Furnizor Necunoscut'}
                    </TableCell>

                    <TableCell className='py-1'>
                      {formatDateTime(new Date(inv.invoiceDate)).dateOnly}
                    </TableCell>

                    <TableCell className='py-1'>
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

                    <TableCell className='py-1'>
                      <Badge
                        variant={
                          SUPPLIER_INVOICE_STATUS_MAP[inv.status]?.variant ||
                          'outline'
                        }
                      >
                        {SUPPLIER_INVOICE_STATUS_MAP[inv.status]?.name}
                      </Badge>
                    </TableCell>

                    <TableCell className='text-right font-medium py-1'>
                      {(() => {
                        // 1. Determinăm valoarea reală de afișat
                        let displayValue = inv.totals.grandTotal
                        const isStornoType = inv.invoiceType === 'STORNO'
                        const isNegativeValue = inv.totals.grandTotal < 0

                        // Dacă e tip STORNO dar valoarea e pozitivă -> o afișăm ca negativă
                        if (isStornoType && !isNegativeValue) {
                          displayValue = -inv.totals.grandTotal
                        }

                        // 2. Determinăm culoarea (orice e negativ e roșu)
                        const isRed = displayValue < 0

                        return (
                          <span className={isRed ? 'text-red-600' : ''}>
                            {formatCurrency(displayValue)}
                          </span>
                        )
                      })()}
                    </TableCell>

                    <TableCell className='py-1'>
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

                          {/* LOGICA NOUĂ AICI */}
                          {inv.status !== 'PLATITA' && (
                            <>
                              {/* Folosim variabila definită mai sus: isCompensatable */}
                              {isCompensatable ? (
                                <DropdownMenuItem
                                  onClick={() => handleCompensate(inv)}
                                  disabled={processingId === inv._id}
                                  className='text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer'
                                >
                                  {processingId === inv._id ? (
                                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                  ) : null}
                                  Genereaza Compensare
                                </DropdownMenuItem>
                              ) : (
                                /* 2. Dacă e factură normală (Pozitivă) -> Arătăm butonul de Plată */
                                <DropdownMenuItem
                                  onClick={() =>
                                    inv.supplierId &&
                                    onOpenCreatePayment(
                                      inv.supplierId._id,
                                      inv._id,
                                    )
                                  }
                                >
                                  Înregistrează Plată
                                </DropdownMenuItem>
                              )}
                            </>
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

      {/* Paginare Sincronizată cu URL-ul */}
      {data.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-4 border-t bg-background shrink-0'>
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
            Pagina {currentPage} din {data.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= data.totalPages || isPending}
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
