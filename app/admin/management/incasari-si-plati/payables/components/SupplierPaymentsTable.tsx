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
import { MoreHorizontal, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cancelSupplierPayment } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { SUPPLIER_PAYMENT_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.constants'
import { PopulatedSupplierPayment } from './SupplierAllocationModal'
import { formatCurrency, formatDateTime, toSlug } from '@/lib/utils'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { toast } from 'sonner'
import { getPaymentMethodName } from '@/lib/db/modules/setting/efactura/anaf.constants'

const FALLBACK_STATUS = { name: 'Necunoscut', variant: 'outline' } as const

interface SupplierPaymentsTableProps {
  // Primim datele direct de la server
  data: {
    data: PopulatedSupplierPayment[]
    totalPages: number
    total: number
  }
  onOpenAllocationModal: (payment: PopulatedSupplierPayment) => void
}

export function SupplierPaymentsTable({
  data,
  onOpenAllocationModal,
}: SupplierPaymentsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentPage = Number(searchParams.get('page')) || 1
  const [isPending, setIsPending] = useState(false)

  // State local doar pentru acțiunea de anulare (nu afectează navigarea)
  const [paymentToCancel, setPaymentToCancel] =
    useState<PopulatedSupplierPayment | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  const handlePageChange = (newPage: number) => {
    setIsPending(true)
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
    setIsPending(false)
  }

  const handleConfirmCancel = async () => {
    if (!paymentToCancel) return
    setIsCanceling(true)
    try {
      const result = await cancelSupplierPayment(paymentToCancel._id)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Eroare neașteptată.')
    } finally {
      setIsCanceling(false)
      setPaymentToCancel(null)
    }
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative'>
        <table className='w-full caption-bottom text-sm text-left'>
          <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
            <TableRow className='bg-muted/50 hover:bg-muted/50'>
              <TableHead className='w-[50px] py-1'>#</TableHead>
              <TableHead className='py-1'>Plată (Serie - Nr.)</TableHead>
              <TableHead className='py-1'>Furnizor</TableHead>
              <TableHead className='py-1'>Dată</TableHead>
              <TableHead className='py-1'>Status</TableHead>
              <TableHead className='text-right py-1'>Sumă Totală</TableHead>
              <TableHead className='text-right py-1'>Sumă Nealocată</TableHead>
              <TableHead className='w-[50px] py-1'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='h-24 text-center text-muted-foreground py-1'
                >
                  Nu există plăți conform filtrelor.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((payment, index) => {
                const statusInfo =
                  SUPPLIER_PAYMENT_STATUS_MAP[payment.status] || FALLBACK_STATUS
                const isCancelable = payment.status === 'NEALOCATA'
                const isAllocationsViewable = payment.status !== 'ANULATA'
                const globalIndex =
                  (currentPage - 1) * PAYABLES_PAGE_SIZE + index + 1

                return (
                  <TableRow key={payment._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium text-muted-foreground py-1'>
                      {globalIndex}
                    </TableCell>
                    <TableCell className='font-medium py-0.5'>
                      {/* 1. Am adăugat wrapper-ul SPAN clickabil */}
                      <span
                        className='cursor-pointer hover:underline hover:text-primary transition-colors'
                        onClick={() => onOpenAllocationModal(payment)}
                        title='Gestionează Plata / Alocările'
                      >
                        {(() => {
                          const series = payment.seriesName?.toUpperCase()
                          const number = payment.paymentNumber || 'N/A'
                          return series ? `${series} - ${number}` : number
                        })()}
                      </span>

                      <div className='text-[10px] text-muted-foreground'>
                        {getPaymentMethodName(payment.paymentMethod)}
                      </div>
                    </TableCell>
                    <TableCell className='py-1'>
                      {payment.supplierId ? (
                        <span
                          className='cursor-pointer hover:underline hover:text-primary transition-colors'
                          onClick={() => {
                            router.push(
                              `/admin/management/suppliers/${payment.supplierId._id}/${toSlug(
                                payment.supplierId.name,
                              )}?tab=payments`,
                            )
                          }}
                        >
                          {payment.supplierId.name}
                        </span>
                      ) : (
                        'Furnizor Șters'
                      )}
                    </TableCell>
                    <TableCell className='py-1'>
                      {formatDateTime(new Date(payment.paymentDate)).dateOnly}
                    </TableCell>

                    <TableCell className='py-1'>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right font-medium py-1'>
                      {formatCurrency(payment.totalAmount)}
                    </TableCell>
                    <TableCell className='text-right text-red-600 font-medium py-1'>
                      {formatCurrency(payment.unallocatedAmount)}
                    </TableCell>
                    <TableCell className='py-1'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-7 w-8 p-0'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => onOpenAllocationModal(payment)}
                            disabled={!isAllocationsViewable}
                          >
                            Vezi / Modifică Alocările
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPaymentToCancel(payment)}
                            disabled={!isCancelable}
                            className='text-red-600 focus:text-red-600'
                          >
                            Anulează Plata
                          </DropdownMenuItem>
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

      {/* Alert Dialog Anulare (Rămâne neschimbat) */}
      <AlertDialog
        open={!!paymentToCancel}
        onOpenChange={(open) => !open && setPaymentToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmă Anularea Plății</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi plata {paymentToCancel?.seriesName}{' '}
              - {paymentToCancel?.paymentNumber} în valoare de{' '}
              {formatCurrency(paymentToCancel?.totalAmount || 0)}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={isCanceling}
              className='bg-red-600 hover:bg-red-700'
            >
              {isCanceling ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Da, Anulează'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
