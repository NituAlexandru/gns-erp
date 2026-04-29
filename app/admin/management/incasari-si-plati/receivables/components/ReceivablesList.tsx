'use client'

import { startTransition, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Eye,
  MoreHorizontal,
  Trash2,
  Loader2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  RefreshCcw,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatCurrency, formatDateTime, toSlug } from '@/lib/utils'
import { PopulatedClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'
import { CLIENT_PAYMENT_STATUS_MAP } from '@/lib/db/modules/financial/treasury/receivables/client-payment.constants'
import { cancelClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { toast } from 'sonner'
import { RECEIVABLES_PAGE_SIZE } from '@/lib/constants'
import {
  PAYMENT_METHOD_MAP,
  PaymentMethodKey,
} from '@/lib/db/modules/financial/treasury/payment.constants'
import { Input } from '@/components/ui/input'

interface ReceivablesListProps {
  data: {
    data: PopulatedClientPayment[]
    pagination: {
      total: number
      page: number
      totalPages: number
    }
  }
  isAdmin: boolean
  onOpenAllocationModal: (payment: PopulatedClientPayment) => void
  onOpenRefundModal?: (payment: PopulatedClientPayment) => void
}

const FALLBACK_STATUS = { name: 'Necunoscut', variant: 'secondary' } as const

export function ReceivablesList({
  data,
  isAdmin,
  onOpenAllocationModal,
  onOpenRefundModal,
}: ReceivablesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [paymentToCancel, setPaymentToCancel] =
    useState<PopulatedClientPayment | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const currentPage = Number(searchParams.get('page')) || 1
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

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

  // Navigare Pagină
  const handlePageChange = (newPage: number) => {
    setIsPending(true)
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
    setIsPending(false)
  }

  // Acțiune Anulare
  const handleConfirmCancel = async () => {
    if (!paymentToCancel) return

    setIsCanceling(true)
    try {
      const result = await cancelClientPayment(paymentToCancel._id)

      if (result.success) {
        toast.success(result.message)
        startTransition(() => {
          router.refresh()
        })
      } else {
        toast.error('Eroare la anulare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setIsCanceling(false)
      setPaymentToCancel(null)
    }
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative '>
        <table className='w-full caption-bottom text-sm text-left'>
          <TableHeader className='sticky top-0 z-10 bg-muted/50 shadow-sm backdrop-blur-sm'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-[50px] py-1'>#</TableHead>
              <TableHead className='py-1'>Serie / Nr. Doc.</TableHead>
              <TableHead className='py-1'>Client</TableHead>
              <TableHead className='py-1'>Tip Plată</TableHead>
              <TableHead className='py-1'>Data Plată</TableHead>
              <TableHead className='text-right py-1'>Total Încasat</TableHead>
              <TableHead className='text-right py-1'>Nealocat</TableHead>
              <TableHead className='py-1'>Status</TableHead>
              {isAdmin && <TableHead className='w-[50px] py-1'></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 8 : 7}
                  className='h-32 text-center text-muted-foreground'
                >
                  Nu există încasări înregistrate conform filtrelor.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((payment, index) => {
                const globalIndex =
                  (currentPage - 1) * RECEIVABLES_PAGE_SIZE + index + 1
                const statusInfo =
                  CLIENT_PAYMENT_STATUS_MAP[payment.status] || FALLBACK_STATUS

                const isAllocationsViewable = payment.status !== 'ANULATA'
                const isCancelable = payment.status === 'NEALOCATA' // Doar dacă nu s-a folosit niciun ban
                const isRefundDoc = payment.isRefund || payment.totalAmount < 0

                return (
                  <TableRow
                    key={payment._id}
                    className='hover:bg-muted/30 group transition-colors'
                  >
                    <TableCell className='font-medium text-muted-foreground py-1'>
                      {globalIndex}
                    </TableCell>

                    <TableCell className='py-1 font-medium uppercase'>
                      <span
                        className='cursor-pointer hover:underline hover:text-primary transition-colors'
                        onClick={() => {
                          if (isRefundDoc && onOpenRefundModal) {
                            onOpenRefundModal(payment)
                          } else {
                            onOpenAllocationModal(payment)
                          }
                        }}
                        title={
                          isRefundDoc
                            ? 'Vezi Detalii Restituire'
                            : 'Vezi Detalii Încasare'
                        }
                      >
                        {/* AICI AM SCHIMBAT */}
                        {isRefundDoc && (
                          <span className='text-primary font-bold mr-1'>
                            RESTITUIRE -
                          </span>
                        )}
                        {payment.seriesName ? `${payment.seriesName} - ` : ''}
                        {payment.paymentNumber}
                      </span>
                    </TableCell>

                    <TableCell className='py-1'>
                      {payment.clientId ? (
                        <span
                          className='cursor-pointer hover:underline hover:text-primary transition-colors'
                          onClick={() => {
                            router.push(
                              `/clients/${payment.clientId._id}/${toSlug(
                                payment.clientId.name,
                              )}?tab=payments`,
                            )
                          }}
                        >
                          {payment.clientId.name}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>

                    <TableCell className='py-1 text-muted-foreground'>
                      {PAYMENT_METHOD_MAP[
                        payment.paymentMethod as PaymentMethodKey
                      ]?.name || payment.paymentMethod}
                    </TableCell>

                    <TableCell className='py-1 text-muted-foreground'>
                      {formatDateTime(new Date(payment.paymentDate)).dateOnly}
                    </TableCell>

                    <TableCell className='text-right py-1'>
                      {formatCurrency(payment.totalAmount)}
                    </TableCell>

                    <TableCell className='text-right font-bold py-1'>
                      <span
                        className={
                          Math.abs(payment.unallocatedAmount) > 0
                            ? isRefundDoc /* AICI AM SCHIMBAT */
                              ? 'text-red-600'
                              : 'text-green-600'
                            : 'text-muted-foreground'
                        }
                      >
                        {formatCurrency(payment.unallocatedAmount)}
                      </span>
                    </TableCell>

                    <TableCell className='py-1'>
                      <div className='flex gap-2 items-center'>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.name}
                        </Badge>
                        {/* AICI AM SCHIMBAT */}
                        {isRefundDoc && (
                          <Badge
                            variant='outline'
                            className='text-primary border-primary-200 bg-primary-50/50'
                          >
                            RESTITUIRE
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {isAdmin && (
                      <TableCell className='py-1'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' className='h-8 w-8 p-0'>
                              <span className='sr-only'>Deschide meniu</span>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            {/* AICI AM SCHIMBAT */}
                            {isRefundDoc ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  onOpenRefundModal &&
                                  onOpenRefundModal(payment)
                                }
                                disabled={!isAllocationsViewable}
                                className='cursor-pointer'
                              >
                                <RefreshCcw className='mr-2 h-4 w-4' />
                                Gestionează Restituirea
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onOpenAllocationModal(payment)}
                                disabled={!isAllocationsViewable}
                                className='cursor-pointer'
                              >
                                <Eye className='mr-2 h-4 w-4' />
                                Vezi / Modifică Alocările
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className='text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer'
                              onClick={() => setPaymentToCancel(payment)}
                              disabled={!isCancelable}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Anulează {/* AICI AM SCHIMBAT */}
                              {isRefundDoc ? 'Restituirea' : 'Încasarea'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </table>
      </div>

      {/* FOOTER PAGINARE (Sincronizat cu URL) */}
      {data.pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-3 border-t bg-background shrink-0'>
          {/* Buton: Prima Pagină (<<) */}
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

          {/* Buton: Anterior (<) */}
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

          {/* Zona Centrală: Sari la Pagina */}
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

          {/* Buton: Următor (>) */}
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

          {/* Buton: Ultima Pagină (>>) */}
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

      {/* MODAL DE CONFIRMARE ANULARE */}
      <AlertDialog
        open={!!paymentToCancel}
        onOpenChange={(open) => !open && setPaymentToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmă Anularea{' '}
              {paymentToCancel?.isRefund ? 'Restituirii' : 'Încasării'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi încasarea{' '}
              <span className='font-bold'>
                {paymentToCancel?.paymentNumber}
              </span>{' '}
              în valoare de{' '}
              <span className='font-bold text-red-600'>
                {formatCurrency(paymentToCancel?.totalAmount || 0)}
              </span>
              ? Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Păstrează Încasarea
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className='bg-red-600 hover:bg-red-700'
              disabled={isCanceling}
            >
              {isCanceling ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              Anulează Definitiv
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
