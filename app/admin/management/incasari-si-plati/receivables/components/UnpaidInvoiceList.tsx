'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDateTime, round2 } from '@/lib/utils'
import { UnpaidInvoice, PopulatedClientPayment } from './AllocationModal'
import { createManualAllocation } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'

interface UnpaidInvoiceListProps {
  invoices: UnpaidInvoice[]
  payment: PopulatedClientPayment | null
  onAllocationCreated: () => void
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

  if (!payment) return null

  const handleAmountChange = (invoiceId: string, amountStr: string) => {
    const amount = parseFloat(amountStr) || 0
    setAmountsToAllocate((prev) => ({
      ...prev,
      [invoiceId]: amount,
    }))
  }

  const handleAllocate = async (invoice: UnpaidInvoice) => {
    const amountToAllocate = round2(amountsToAllocate[invoice._id] || 0)

    if (amountToAllocate <= 0) {
      toast.error('Suma de alocat trebuie să fie mai mare ca zero.')
      return
    }
    if (amountToAllocate > invoice.remainingAmount) {
      toast.error(
        `Suma (${formatCurrency(
          amountToAllocate
        )}) este mai mare decât restul de plată al facturii.`
      )
      return
    }
    if (amountToAllocate > payment.unallocatedAmount) {
      toast.error(
        `Suma de alocat (${formatCurrency(
          amountToAllocate
        )}) este mai mare decât suma nealocată din încasare (${formatCurrency(
          payment.unallocatedAmount
        )}).`
      )
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
          duration: 7000,
          description: (
            <div className='mt-2'>
              <p>
                Suma de{' '}
                <span className='font-medium text-green-600'>
                  {formatCurrency(result.data.amountAllocated)}
                </span>{' '}
                a fost alocată facturii{' '}
                <span className='font-medium'>
                  {invoiceDetails.seriesName}-{invoiceDetails.invoiceNumber}
                </span>
                .
              </p>
            </div>
          ),
        })
        setAmountsToAllocate((prev) => ({ ...prev, [invoice._id]: 0 }))
        onAllocationCreated()
      } else {
        toast.error('Eroare la alocare:', { description: result.message })
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
        {invoices.map((invoice) => (
          <div
            key={invoice._id}
            className='flex flex-col gap-3 rounded-md border bg-background p-3'
          >
            {/* Detalii Factură */}
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
                <p className='font-semibold text-lg'>
                  {formatCurrency(invoice.remainingAmount)}
                </p>
                <p className='text-sm text-muted-foreground'>
                  din {formatCurrency(invoice.totals.grandTotal)}
                </p>
              </div>
            </div>

            {/* Acțiuni de Alocare */}
            <div className='flex items-center gap-2'>
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
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
