'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { SUPPLIER_PAYMENT_STATUS_MAP } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.constants'
import { PopulatedSupplierPayment } from './SupplierAllocationModal'
import { cancelSupplierPayment } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Payment = PopulatedSupplierPayment
type SetAllocationPayment = (payment: PopulatedSupplierPayment | null) => void

interface SupplierPaymentsListProps {
  payments: Payment[]
  onOpenAllocationModal: SetAllocationPayment
}

function formatDate(dateString: Date | string) {
  return new Date(dateString).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const FALLBACK_STATUS = { name: 'Necunoscut', variant: 'outline' }

export function SupplierPaymentsList({
  payments,
  onOpenAllocationModal,
}: SupplierPaymentsListProps) {
  const router = useRouter()
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  const handleViewAllocations = (payment: PopulatedSupplierPayment) => {
    onOpenAllocationModal(payment)
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
    <>
      <Card className='flex-1 flex flex-col overflow-hidden'>
        <CardHeader>
          <CardTitle>Istoric Plăți Furnizori</CardTitle>
        </CardHeader>

        <CardContent className='flex-1 overflow-y-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plată (Serie - Nr.)</TableHead>
                <TableHead>Furnizor</TableHead>
                <TableHead>Dată</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-right'>Sumă Totală</TableHead>
                <TableHead className='text-right'>Sumă Nealocată</TableHead>
                <TableHead className='text-right'>Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className='text-center'>
                    Nu există plăți înregistrate.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((payment) => {
                const statusInfo =
                  SUPPLIER_PAYMENT_STATUS_MAP[payment.status] || FALLBACK_STATUS

                const isCancelable = payment.status === 'NEALOCATA'
                const isAllocationsViewable = payment.status !== 'ANULATA'

                return (
                  <TableRow key={payment._id}>
                    <TableCell className='font-medium'>
                      {payment.seriesName?.toUpperCase() || ''} -{' '}
                      {payment.paymentNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {payment.supplierId?.name || 'Furnizor Șters'}
                    </TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(payment.totalAmount)}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      {formatCurrency(payment.unallocatedAmount)}
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => handleViewAllocations(payment)}
                            disabled={!isAllocationsViewable}
                          >
                            Vezi / Modifică Alocările
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPaymentToCancel(payment)}
                            disabled={!isCancelable}
                          >
                            Anulează Plata
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alert Dialog de Confirmare Anulare */}
      <AlertDialog
        open={!!paymentToCancel}
        onOpenChange={(open) => !open && setPaymentToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmă Anularea Plății</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi plata cu seria{' '}
              <span className='font-bold'>
                {paymentToCancel?.seriesName || 'N/A'} -{' '}
                {paymentToCancel?.paymentNumber || 'N/A'}
              </span>{' '}
              în valoare de{' '}
              <span className='font-bold text-red-600'>
                {formatCurrency(paymentToCancel?.totalAmount || 0)}
              </span>
              ? Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {' '}
            {/* <--- AICI ESTE FIX-UL */}
            <AlertDialogCancel disabled={isCanceling}>
              Păstrează Plata
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
    </>
  )
}
