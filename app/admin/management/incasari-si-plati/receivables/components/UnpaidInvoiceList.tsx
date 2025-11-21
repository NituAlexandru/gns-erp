'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRightLeft, Loader2, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDateTime, round2 } from '@/lib/utils'
import { UnpaidInvoice, PopulatedClientPayment } from './AllocationModal'
import {
  createCompensationPayment,
  createManualAllocation,
} from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { useSession } from 'next-auth/react'

interface UnpaidInvoiceListProps {
  invoices: UnpaidInvoice[]
  payment: PopulatedClientPayment | null
  onAllocationCreated: (updatedPayment?: PopulatedClientPayment) => void
}

export function UnpaidInvoiceList({
  invoices,
  payment,
  onAllocationCreated,
}: UnpaidInvoiceListProps) {
  const [amountsToAllocate, setAmountsToAllocate] = useState<
    Record<string, number>
  >({})
  const [allocatingId, setAllocatingId] = useState<string | null>(null)
  const { data: session } = useSession()

  if (!payment) return null

  const handleAmountChange = (invoiceId: string, amountStr: string) => {
    const amount = parseFloat(amountStr) || 0
    setAmountsToAllocate((prev) => ({
      ...prev,
      [invoiceId]: amount,
    }))
  }

  const handleCompensate = async (invoice: UnpaidInvoice) => {
    if (!session?.user?.id) return

    setAllocatingId(invoice._id)
    try {
      const result = await createCompensationPayment(
        invoice._id,
        session.user.id,
        session.user.name || 'User'
      )

      if (result.success) {
        toast.success(result.message)
        // Facem refresh la părinte (fără payment update, doar refresh liste)
        onAllocationCreated()
      } else {
        toast.error('Eroare:', { description: result.message })
      }
    } catch {
      toast.error('Eroare neașteptată la compensare.')
    }
    setAllocatingId(null)
  }

  const handleAllocate = async (invoice: UnpaidInvoice) => {
    const amountToAllocate = round2(amountsToAllocate[invoice._id] || 0)

    if (amountToAllocate <= 0) {
      toast.error('Suma de alocat trebuie să fie mai mare ca zero.')
      return
    }

    // Validarea strictă doar pentru pozitive,
    // pentru că negativele merg pe fluxul de Compensare acum.
    if (amountToAllocate > payment.unallocatedAmount) {
      toast.error('Suma depășește disponibilul din încasare.')
      return
    }

    if (amountToAllocate > invoice.remainingAmount) {
      toast.error('Suma depășește restul de plată.')
      return
    }

    setAllocatingId(invoice._id)
    try {
      const result = await createManualAllocation({
        paymentId: payment._id,
        invoiceId: invoice._id,
        amountAllocated: amountToAllocate,
        allocationDate: new Date(),
      })

      if (result.success && result.data) {
        const invoiceDetails = result.data.invoiceId
        toast.success(result.message, {
          description: `Alocat către ${invoiceDetails.seriesName}-${invoiceDetails.invoiceNumber}`,
        })
        setAmountsToAllocate((prev) => ({ ...prev, [invoice._id]: 0 }))
        onAllocationCreated(
          result.updatedPayment as unknown as PopulatedClientPayment
        )
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    }
    setAllocatingId(null)
  }

  const handleAllocateMax = (invoice: UnpaidInvoice) => {
    const maxAmount = Math.min(
      invoice.remainingAmount,
      payment.unallocatedAmount
    )
    setAmountsToAllocate((prev) => ({
      ...prev,
      [invoice._id]: round2(maxAmount),
    }))
  }

  return (
    <Card className='shadow-none border-dashed'>
      <CardContent className='p-4 space-y-3'>
        {invoices.length === 0 && (
          <p className='text-center text-sm text-muted-foreground py-4'>
            Nicio factură neplătită găsită pentru acest client.
          </p>
        )}
        {invoices.map((invoice) => {
          // VERIFICĂM TIPUL FACTURII
          const isNegative = invoice.remainingAmount < 0

          return (
            <div
              key={invoice._id}
              className='flex flex-col gap-3 rounded-md border bg-background p-3'
            >
              <div className='flex items-center justify-between'>
                <div>
                  <p className='font-medium'>
                    {invoice.seriesName}-{invoice.invoiceNumber}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Scadentă la:{' '}
                    {formatDateTime(new Date(invoice.dueDate)).dateOnly}
                  </p>
                </div>
                <div className='text-right'>
                  <p
                    className={`font-semibold text-lg ${isNegative ? 'text-red-600' : ''}`}
                  >
                    {formatCurrency(invoice.remainingAmount)}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    din {formatCurrency(invoice.totals.grandTotal)}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                {isNegative ? (
                  /* --- UI PENTRU FACTURI NEGATIVE (Buton Compensare) --- */
                  <Button
                    type='button'
                    size='sm'
                    variant='secondary'
                    className='w-full   hover:bg-red-500 gap-2'
                    onClick={() => handleCompensate(invoice)}
                    disabled={allocatingId === invoice._id}
                  >
                    {allocatingId === invoice._id ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <ArrowRightLeft className='h-4 w-4' />
                    )}
                    Generează Compensare (Separat)
                  </Button>
                ) : (
                  /* --- UI PENTRU FACTURI NORMALE (Input + Alocă) --- */
                  <>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      value={amountsToAllocate[invoice._id] || ''}
                      onChange={(e) =>
                        handleAmountChange(invoice._id, e.target.value)
                      }
                      disabled={!!allocatingId}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => handleAllocateMax(invoice)}
                      disabled={!!allocatingId}
                    >
                      MAX
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='gap-2'
                      onClick={() => handleAllocate(invoice)}
                      disabled={
                        allocatingId === invoice._id ||
                        !amountsToAllocate[invoice._id] ||
                        amountsToAllocate[invoice._id] <= 0
                      }
                    >
                      {allocatingId === invoice._id ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <PlusCircle className='h-4 w-4' />
                      )}
                      Alocă
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
