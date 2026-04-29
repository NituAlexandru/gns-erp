'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { PopulatedSupplierPayment } from './SupplierAllocationModal'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  getUnallocatedAdvancesForSupplier,
  createSupplierRefundAllocation,
  getRefundAllocationsForPayment,
  deleteSupplierRefundAllocation,
} from '@/lib/db/modules/financial/treasury/payables/supplier-refund-allocation.actions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface SupplierRefundAllocationSheetProps {
  refundPayment: PopulatedSupplierPayment | null
  onClose: () => void
}

export function SupplierRefundAllocationSheet({
  refundPayment,
  onClose,
}: SupplierRefundAllocationSheetProps) {
  const router = useRouter()
  const [advances, setAdvances] = useState<any[]>([])
  const [existingAllocations, setExistingAllocations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const isOpen = !!refundPayment

  const fetchData = useCallback(async () => {
    if (!refundPayment) return
    setIsLoading(true)
    const [resAdvances, resExisting] = await Promise.all([
      getUnallocatedAdvancesForSupplier(refundPayment.supplierId._id),
      getRefundAllocationsForPayment(refundPayment._id),
    ])
    if (resAdvances.success) setAdvances(resAdvances.data)
    if (resExisting.success) setExistingAllocations(resExisting.data)
    setIsLoading(false)
  }, [refundPayment])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAllocate = async (
    advanceId: string,
    availableAdvanceAmt: number,
  ) => {
    if (!refundPayment) return
    const refundAbsAmount = Math.abs(refundPayment.unallocatedAmount)
    const amountToAllocate = round2(
      Math.min(refundAbsAmount, availableAdvanceAmt),
    )

    setProcessingId(advanceId)
    const result = await createSupplierRefundAllocation({
      advancePaymentId: advanceId,
      refundPaymentId: refundPayment._id,
      amountAllocated: amountToAllocate,
      allocationDate: new Date(),
    })

    if (result.success) {
      toast.success(result.message)
      await fetchData()
      startTransition(() => {
        router.refresh()
      })
    } else {
      toast.error('Eroare la alocare:', { description: result.message })
    }
    setProcessingId(null)
  }

  const handleDelete = async (allocId: string) => {
    setDeletingId(allocId)
    const result = await deleteSupplierRefundAllocation(allocId)
    if (result.success) {
      toast.success(result.message)
      await fetchData()
      startTransition(() => {
        router.refresh()
      })
    } else {
      toast.error('Eroare la ștergere:', { description: result.message })
    }
    setDeletingId(null)
  }

  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='sm:max-w-3xl w-full overflow-y-auto p-4'>
        <SheetHeader>
          <SheetTitle>
            Gestionează Restituirea: {refundPayment?.seriesName} -{' '}
            {refundPayment?.paymentNumber}
          </SheetTitle>
          <SheetDescription>
            Leagă banii restituiți de la {refundPayment?.supplierId?.name} de
            avansurile plătite anterior.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className='flex h-[40vh] items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-1 gap-6 py-6'>
            {/* SECȚIUNEA 1: ALOCĂRI EXISTENTE */}
            <div className='space-y-1'>
              <h3 className='font-semibold'>Alocări Existente</h3>
              <Card className='shadow-none border-dashed p-0'>
                <CardContent className='p-2 space-y-2'>
                  {existingAllocations.length === 0 && (
                    <p className='text-center text-sm text-muted-foreground py-2'>
                      Nicio alocare existentă.
                    </p>
                  )}
                  {existingAllocations.map((alloc) => (
                    <div
                      key={alloc._id}
                      className='flex items-center justify-between rounded-md border bg-background px-2 py-1'
                    >
                      <div>
                        <p className='font-medium'>
                          Avans: {alloc.advancePaymentId?.seriesName}{' '}
                          {alloc.advancePaymentId?.paymentNumber}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          {
                            formatDateTime(new Date(alloc.allocationDate))
                              .dateOnly
                          }
                        </p>
                      </div>

                      <div className='flex items-center gap-2'>
                        <span className='font-semibold text-lg'>
                          {formatCurrency(alloc.amountAllocated)}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='text-red-600 hover:text-red-700'
                              disabled={!!deletingId || isPending}
                            >
                              {deletingId === alloc._id ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                              ) : (
                                <Trash2 className='h-4 w-4' />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirmă Ștergerea
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Ești sigur că vrei să anulezi această alocare de{' '}
                                {formatCurrency(alloc.amountAllocated)}? Sumele
                                vor fi returnate pe documentele inițiale.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anulează</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(alloc._id)}
                                className='bg-red-600 hover:bg-red-700'
                              >
                                Șterge Alocarea
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* SECȚIUNEA 2: AVANSURI DISPONIBILE */}
            <div className='space-y-1'>
              <div className='flex justify-between items-end mb-2'>
                <h3 className='font-semibold'>Avansuri Disponibile</h3>
                <span className='text-sm text-muted-foreground'>
                  Restituire nealocată:{' '}
                  <span className='font-bold text-red-600'>
                    {formatCurrency(
                      Math.abs(refundPayment?.unallocatedAmount || 0),
                    )}
                  </span>
                </span>
              </div>

              <div className='border rounded-md bg-background'>
                <Table>
                  <TableHeader>
                    <TableRow className='h-9 bg-muted/50'>
                      <TableHead className='py-1'>Plată (Avans)</TableHead>
                      <TableHead className='py-1'>Dată</TableHead>
                      <TableHead className='text-right py-1'>
                        Rest Nealocat
                      </TableHead>
                      <TableHead className='w-[100px] py-1 text-right'>
                        Acțiune
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {advances.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className='h-16 text-center text-muted-foreground py-1'
                        >
                          Nu există avansuri disponibile.
                        </TableCell>
                      </TableRow>
                    ) : (
                      advances.map((adv) => (
                        <TableRow key={adv._id} className='h-10'>
                          <TableCell className='py-1 font-medium'>
                            {adv.seriesName ? `${adv.seriesName} - ` : ''}
                            {adv.paymentNumber}
                          </TableCell>
                          <TableCell className='py-1 text-muted-foreground'>
                            {formatDateTime(adv.paymentDate).dateOnly}
                          </TableCell>
                          <TableCell className='text-right py-1 font-semibold text-primary'>
                            {formatCurrency(adv.unallocatedAmount)}
                          </TableCell>
                          <TableCell className='text-right py-1'>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-xs text-primary'
                              onClick={() =>
                                handleAllocate(adv._id, adv.unallocatedAmount)
                              }
                              disabled={
                                processingId === adv._id ||
                                isPending ||
                                Math.abs(
                                  refundPayment?.unallocatedAmount || 0,
                                ) < 0.01
                              }
                            >
                              {processingId === adv._id ? (
                                <Loader2 className='h-3 w-3 animate-spin mr-1' />
                              ) : null}
                              Stinge
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <SheetFooter>
          <Button variant='outline' onClick={onClose} disabled={isPending}>
            Închide
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
