'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, MoreHorizontal, Trash2, Loader2 } from 'lucide-react'
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
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PopulatedClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.types'
import { CLIENT_PAYMENT_STATUS_MAP } from '@/lib/db/modules/financial/treasury/receivables/client-payment.constants'
import { cancelClientPayment } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type SetAllocationPayment = (payment: PopulatedClientPayment) => void

interface ReceivablesListProps {
  payments: PopulatedClientPayment[]
  isAdmin: boolean
  onOpenAllocationModal: SetAllocationPayment
}

const FALLBACK_STATUS = { name: 'Necunoscut', variant: 'secondary' } as const

export function ReceivablesList({
  payments,
  isAdmin,
  onOpenAllocationModal,
}: ReceivablesListProps) {
  const router = useRouter()
  const [paymentToCancel, setPaymentToCancel] =
    useState<PopulatedClientPayment | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  const handleViewAllocations = (payment: PopulatedClientPayment) => {
    onOpenAllocationModal(payment)
  }

  const handleConfirmCancel = async () => {
    if (!paymentToCancel) return

    setIsCanceling(true)
    try {
      const result = await cancelClientPayment(paymentToCancel._id)

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
      <Card>
        <CardHeader>
          <CardTitle>Istoric Încasări</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nr. Doc.</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Dată</TableHead>
                <TableHead className='text-right'>Sumă Totală</TableHead>
                <TableHead className='text-right'>Sumă Nealocată</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && (
                  <TableHead className='text-right'>Acțiuni</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className='text-center text-muted-foreground'
                  >
                    Nu există încasări înregistrate.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((payment) => {
                const statusInfo =
                  CLIENT_PAYMENT_STATUS_MAP[payment.status] || FALLBACK_STATUS

                const isAllocationsViewable = payment.status !== 'ANULATA'
                const isCancelable = payment.status === 'NEALOCATA'

                return (
                  <TableRow key={payment._id}>
                    <TableCell className='font-medium'>
                      {payment.paymentNumber}
                    </TableCell>
                    <TableCell>{payment.clientId?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {formatDateTime(new Date(payment.paymentDate)).dateOnly}
                    </TableCell>
                    <TableCell className='text-right'>
                      {formatCurrency(payment.totalAmount)}
                    </TableCell>
                    <TableCell className='text-right font-bold'>
                      {formatCurrency(payment.unallocatedAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
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
                              <Eye className='mr-2 h-4 w-4' />
                              Gestionează Alocările
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-red-600'
                              onClick={() => setPaymentToCancel(payment)}
                              disabled={!isCancelable}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              Anulează Încasarea
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!paymentToCancel}
        onOpenChange={(open) => !open && setPaymentToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmă Anularea Încasării</AlertDialogTitle>
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
    </>
  )
}
