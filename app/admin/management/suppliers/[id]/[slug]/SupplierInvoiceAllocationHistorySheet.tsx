'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getInvoiceAllocationHistory } from '@/lib/db/modules/financial/treasury/payables/supplier-allocation.actions'
import { SupplierLedgerEntry } from '@/lib/db/modules/suppliers/summary/supplier-summary.actions'

interface Props {
  ledgerEntry: SupplierLedgerEntry | null
  onClose: () => void
}

interface InvoiceAllocation {
  _id: string
  amountAllocated: number
  paymentId: {
    _id: string
    paymentNumber?: string
    seriesName?: string
    paymentDate: string | Date
  }
}

export function SupplierInvoiceAllocationHistorySheet({
  ledgerEntry,
  onClose,
}: Props) {
  const [allocations, setAllocations] = useState<InvoiceAllocation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const isOpen = !!ledgerEntry && ledgerEntry.documentType !== 'Plată'

  useEffect(() => {
    if (isOpen && ledgerEntry) {
      const fetchData = async () => {
        setIsLoading(true)
        try {
          const res = await getInvoiceAllocationHistory(ledgerEntry._id)
          if (res.success) {
            setAllocations(res.data as InvoiceAllocation[])
          }
        } catch (error) {
          console.error(error)
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    }
  }, [isOpen, ledgerEntry])

  if (!ledgerEntry) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Istoric Plăți Factură</SheetTitle>
          <SheetDescription>
            Document: {ledgerEntry.documentNumber} <br />
            Data: {formatDateTime(new Date(ledgerEntry.date)).dateOnly} <br />
            Valoare Totală: {formatCurrency(ledgerEntry.credit)}
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6'>
          {isLoading ? (
            <div className='flex justify-center py-4'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : allocations.length === 0 ? (
            <p className='text-sm text-muted-foreground text-center py-4'>
              Această factură nu are plăți alocate.
            </p>
          ) : (
            <div className='border rounded-md'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Plății</TableHead>
                    <TableHead>Document Plată</TableHead>
                    <TableHead className='text-right'>Suma Achitată</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc) => (
                    <TableRow key={alloc._id}>
                      <TableCell>
                        {
                          formatDateTime(new Date(alloc.paymentId.paymentDate))
                            .dateOnly
                        }
                      </TableCell>
                      <TableCell>
                        {alloc.paymentId.seriesName}{' '}
                        {alloc.paymentId.paymentNumber}
                      </TableCell>
                      <TableCell className='text-right font-medium'>
                        {formatCurrency(alloc.amountAllocated)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
