'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/utils' // Asigură-te că formatDateTime e importat
import { Button } from '@/components/ui/button'
import { ArrowRightLeft, Loader2, PlusCircle } from 'lucide-react'
import { PopulatedClientPayment, UnpaidInvoice } from './AllocationModal'
import { createCompensationPayment } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'

interface ClientUnpaidInvoiceListProps {
  invoices: UnpaidInvoice[]
  payment: PopulatedClientPayment | null
  onManualAllocateClick: (invoice: UnpaidInvoice) => void
  onSuccess: () => void
}

export function ClientUnpaidInvoiceList({
  invoices,
  payment,
  onManualAllocateClick,
  onSuccess,
}: ClientUnpaidInvoiceListProps) {
  const { data: session } = useSession()
  const [allocatingId, setAllocatingId] = useState<string | null>(null)

  // --- LOGICA DE ALOCARE MANUALĂ (Facturi Pozitive) ---
  const handleManualAllocation = (invoice: UnpaidInvoice) => {
    if (!payment || payment.unallocatedAmount <= 0) {
      toast.warning('Încasarea nu are fonduri nealocate.')
      return
    }
    onManualAllocateClick(invoice)
  }

  // --- LOGICA DE COMPENSARE (Facturi Negative/Storno) ---
  const handleCompensate = async (invoice: UnpaidInvoice) => {
    if (!session?.user?.id) {
      toast.error('Eroare autentificare.')
      return
    }

    setAllocatingId(invoice._id)
    try {
      const result = await createCompensationPayment(
        invoice._id,
        session.user.id,
        session.user.name || 'Operator',
      )

      if (result.success) {
        toast.success(result.message)
        onSuccess()
      } else {
        toast.error('Eroare la compensare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată la compensare.')
    } finally {
      setAllocatingId(null)
    }
  }

  const unallocatedAmount = payment?.unallocatedAmount || 0

  return (
    <Card className='flex-1 flex flex-col overflow-hidden shadow-none border-dashed'>
      <CardHeader className='p-4'>
        {/* Titlu gestionat de părinte */}
      </CardHeader>

      <CardContent className='flex-1 overflow-y-auto p-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Factură (Nr.)</TableHead>
              <TableHead>Scadentă</TableHead>
              <TableHead className='text-right'>Rest Plată</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className='text-center h-24 text-muted-foreground'
                >
                  Nicio factură neplătită disponibilă.
                </TableCell>
              </TableRow>
            )}
            {invoices.map((invoice) => {
              const isNegative = invoice.remainingAmount < 0
              const canAllocate = unallocatedAmount > 0
              const isBusy = allocatingId === invoice._id

              return (
                <TableRow key={invoice._id}>
                  <TableCell className='font-medium'>
                    <div className='flex flex-col'>
                      <span>
                        {invoice.seriesName?.toUpperCase()} -{' '}
                        {invoice.invoiceNumber}
                      </span>
                      {isNegative && (
                        <span className='text-[10px] text-red-600 font-bold'>
                          STORNO / RETUR
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* AICI ERA EROAREA: Am adăugat new Date() */}
                  <TableCell>
                    {formatDateTime(new Date(invoice.dueDate)).dateOnly}
                  </TableCell>

                  <TableCell
                    className={`text-right font-medium ${isNegative ? 'text-red-600' : ''}`}
                  >
                    {formatCurrency(invoice.remainingAmount)}
                  </TableCell>
                  <TableCell className='text-right'>
                    {isNegative ? (
                      <Button
                        size='sm'
                        variant='secondary'
                        className='gap-2 hover:bg-red-100 hover:text-red-700 transition-colors'
                        onClick={() => handleCompensate(invoice)}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <Loader2 className='h-3 w-3 animate-spin' />
                        ) : (
                          <ArrowRightLeft className='h-3 w-3' />
                        )}
                        Compensează
                      </Button>
                    ) : (
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleManualAllocation(invoice)}
                        disabled={!canAllocate || isBusy}
                        className='gap-2'
                      >
                        <PlusCircle className='h-3 w-3' />
                        Alocă
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
