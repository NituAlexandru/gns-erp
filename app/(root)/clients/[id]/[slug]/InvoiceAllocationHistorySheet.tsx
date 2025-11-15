'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getAllocationsForInvoice } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { ClientLedgerEntry } from '@/lib/db/modules/client/summary/client-summary.types'

// Definim tipul pentru o alocare populată (așa cum o returnează noua funcție)
type InvoiceAllocation = {
  _id: string
  paymentId: {
    _id: string
    paymentNumber: string
    seriesName: string
    paymentDate: Date
  }
  amountAllocated: number
  allocationDate: Date
}

interface InvoiceAllocationHistorySheetProps {
  ledgerEntry: ClientLedgerEntry | null
  onClose: () => void
}

export function InvoiceAllocationHistorySheet({
  ledgerEntry,
  onClose,
}: InvoiceAllocationHistorySheetProps) {
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const isOpen = !!ledgerEntry

  useEffect(() => {
    if (ledgerEntry && ledgerEntry._id) {
      const fetchHistory = async () => {
        setIsLoading(true)
        // Apelăm noua acțiune de server
        const result = await getAllocationsForInvoice(ledgerEntry._id)
        if (result.success) {
          setAllocations(result.data as InvoiceAllocation[])
        } else {
          toast.error('Eroare la preluarea alocărilor.', {
            description: result.message,
          })
        }
        setIsLoading(false)
      }
      fetchHistory()
    }
  }, [ledgerEntry])

  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='sm:max-w-lg w-full'>
        <SheetHeader>
          <SheetTitle>
            Istoric Alocări: {ledgerEntry?.documentNumber}
          </SheetTitle>
          <SheetDescription>
            Acestea sunt încasările care au stins (parțial sau total) această
            factură.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className='flex h-60 items-center justify-center'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='py-6'>
            {allocations.length === 0 ? (
              <p className='text-center text-muted-foreground'>
                Factura nu are nicio încasare alocată manual/automat.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dată Alocare</TableHead>
                    <TableHead>Document Încasare</TableHead>
                    <TableHead className='text-right'>Sumă Alocată</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc) => (
                    <TableRow key={alloc._id}>
                      <TableCell>{formatDate(alloc.allocationDate)}</TableCell>
                      <TableCell className='font-medium'>
                        {alloc.paymentId.seriesName}-
                        {alloc.paymentId.paymentNumber}
                      </TableCell>
                      <TableCell className='text-right font-medium text-green-600'>
                        {formatCurrency(alloc.amountAllocated)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        <SheetFooter>
          <Button variant='outline' onClick={onClose}>
            Închide
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
