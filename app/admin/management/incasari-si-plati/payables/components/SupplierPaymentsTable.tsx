'use client'

import { useState, useEffect, useTransition } from 'react'
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
import { getSupplierPayments } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { cancelSupplierPayment } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { SUPPLIER_PAYMENT_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.constants'
import { PopulatedSupplierPayment } from './SupplierAllocationModal'
import { formatCurrency, formatDateTime } from '@/lib/utils' // <--- ACUM O FOLOSIM
import { PAGE_SIZE } from '@/lib/constants'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { getPaymentMethodName } from '@/lib/db/modules/setting/efactura/anaf.constants'

const FALLBACK_STATUS = { name: 'Necunoscut', variant: 'outline' } as const

interface SupplierPaymentsTableProps {
  initialData: {
    data: PopulatedSupplierPayment[]
    totalPages: number
    total: number
  }
  onOpenAllocationModal: (payment: PopulatedSupplierPayment) => void
}

export function SupplierPaymentsTable({
  initialData,
  onOpenAllocationModal,
}: SupplierPaymentsTableProps) {
  const router = useRouter()
  const [payments, setPayments] = useState(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  const [paymentToCancel, setPaymentToCancel] =
    useState<PopulatedSupplierPayment | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  useEffect(() => {
    if (page === 1) return
    startTransition(async () => {
      const result = await getSupplierPayments(page, PAGE_SIZE)
      if (result.success) {
        setPayments(result.data)
        setTotalPages(result.totalPages)
      }
    })
  }, [page])

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
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
            <TableRow className='bg-muted/50 hover:bg-muted/50'>
              <TableHead className='w-[50px]'>#</TableHead>
              <TableHead>Plată (Serie - Nr.)</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Dată</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Sumă Totală</TableHead>
              <TableHead className='text-right'>Sumă Nealocată</TableHead>
              <TableHead className='w-[50px]'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={7} className='h-24 text-center'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='h-24 text-center text-muted-foreground'
                >
                  Nu există plăți.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment, index) => {
                const statusInfo =
                  SUPPLIER_PAYMENT_STATUS_MAP[payment.status] || FALLBACK_STATUS
                const isCancelable = payment.status === 'NEALOCATA'
                const isAllocationsViewable = payment.status !== 'ANULATA'

                return (
                  <TableRow key={payment._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium text-muted-foreground py-1'>
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell className='font-medium py-[7px]'>
                      {payment.seriesName?.toUpperCase() || ''} -{' '}
                      {payment.paymentNumber || 'N/A'}
                      <div className='text-[10px] text-muted-foreground'>
                        {getPaymentMethodName(payment.paymentMethod)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.supplierId?.name || 'Furnizor Șters'}
                    </TableCell>
                    <TableCell>
                      {formatDateTime(new Date(payment.paymentDate)).dateOnly}
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(payment.totalAmount)}
                    </TableCell>
                    <TableCell className='text-right text-red-600 font-medium'>
                      {formatCurrency(payment.unallocatedAmount)}
                    </TableCell>
                    <TableCell>
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
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 0 && (
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
            Pagina {page} din {totalPages}
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

      {/* Alert Dialog Anulare */}
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
