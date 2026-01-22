'use client'

import { useState, useEffect } from 'react'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getClientLedger } from '@/lib/db/modules/client/summary/client-summary.actions'
import { ClientLedgerEntry } from '@/lib/db/modules/client/summary/client-summary.types'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ClientLedgerTableProps {
  clientId: string
  onInvoiceClick: (entry: ClientLedgerEntry) => void
  onPaymentClick: (paymentId: string) => void
  isAdmin: boolean
}

export function ClientLedgerTable({
  clientId,
  onInvoiceClick,
  onPaymentClick,
  isAdmin,
}: ClientLedgerTableProps) {
  const [entries, setEntries] = useState<ClientLedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [finalBalance, setFinalBalance] = useState(0)

  useEffect(() => {
    const fetchLedger = async () => {
      setIsLoading(true)
      const result = await getClientLedger(clientId)

      if (result.success) {
        setEntries(result.data)
        if (result.data.length > 0) {
          setFinalBalance(result.data[result.data.length - 1].runningBalance)
        }
      } else {
        toast.error('Eroare la preluarea fișei contabile.', {
          description: result.message,
        })
      }
      setIsLoading(false)
    }

    fetchLedger()
  }, [clientId])

  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-60'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className='flex items-center justify-center h-40'>
        <p className='text-muted-foreground'>
          Nu există tranzacții înregistrate pentru acest client.
        </p>
      </div>
    )
  }

  return (
    <div className='relative w-full max-h-[450px] overflow-auto border rounded-md'>
      <table className={cn('w-full caption-bottom text-sm')}>
        <TableHeader>
          <TableRow>
            <TableHead className='sticky top-0 bg-muted w-[120px]'>
              Data
            </TableHead>
            <TableHead className='sticky top-0 bg-muted w-[120px]'>
              Scadență
            </TableHead>
            <TableHead className='sticky top-0 bg-muted'>Document</TableHead>
            <TableHead className='sticky top-0 bg-muted'>Detalii</TableHead>
            <TableHead className='sticky top-0 bg-muted text-right'>
              Debit (Datorat)
            </TableHead>
            <TableHead className='sticky top-0 bg-muted text-right'>
              Credit (Încasat)
            </TableHead>
            <TableHead className='sticky top-0 bg-muted text-right'>
              Sold Curent
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => {
            // Calculăm dacă scadența e depășită ȘI mai sunt bani de dat
            const isOverdue =
              entry.dueDate &&
              new Date(entry.dueDate).getTime() < new Date().getTime() &&
              Number(entry.remainingAmount) > 0

            return (
              <TableRow key={index}>
                <TableCell>{formatDate(entry.date)}</TableCell>

                {/* Data scadenței devine roșie doar dacă isOverdue e true */}
                <TableCell
                  className={cn(
                    'text-muted-foreground',
                    isOverdue && 'text-red-600 font-bold',
                  )}
                >
                  {entry.dueDate ? formatDate(new Date(entry.dueDate)) : '-'}
                </TableCell>

                <TableCell>
                  {isAdmin ? (
                    <button
                      onClick={() => {
                        if (entry.documentType === 'Încasare') {
                          onPaymentClick(entry._id.toString())
                        } else {
                          onInvoiceClick(entry)
                        }
                      }}
                      className='font-medium hover:underline text-left cursor-pointer'
                      title='Vezi detalii alocare'
                    >
                      {entry.documentNumber}
                    </button>
                  ) : (
                    <span className='font-medium'>{entry.documentNumber}</span>
                  )}
                </TableCell>

                <TableCell className='text-muted-foreground'>
                  {entry.documentNumber.startsWith('INIT-C') ? (
                    entry.debit > 0 ? (
                      <span className='font-medium text-foreground'>
                        Sold Inițial - Debit
                      </span>
                    ) : (
                      <span className='font-medium text-foreground'>
                        Sold Inițial - Credit
                      </span>
                    )
                  ) : (
                    entry.details
                  )}
                </TableCell>

                <TableCell className='text-right font-medium text-red-600'>
                  {/* Afișăm orice valoare din debit (pozitivă sau negativă), atâta timp cât nu e 0 */}
                  {entry.debit !== 0 ? formatCurrency(entry.debit) : '—'}
                </TableCell>

                {/* 2. COLOANA CREDIT (Încasat) */}
                <TableCell className='text-right font-medium text-green-600'>
                  {/* Afișăm doar dacă există o încasare reală (Credit) */}
                  {entry.credit !== 0
                    ? formatCurrency(Math.abs(entry.credit))
                    : '—'}
                </TableCell>
                <TableCell className='text-right font-bold'>
                  {formatCurrency(entry.runningBalance)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>

        {/* Footer-ul (NU mai este sticky) */}
        <TableFooter className='bg-background'>
          <TableRow>
            <TableCell colSpan={6} className='text-right'>
              <span className='font-bold text-lg'>SOLD FINAL CLIENT:</span>
            </TableCell>
            <TableCell className='text-right'>
              <span className='font-bold text-lg'>
                {formatCurrency(finalBalance)}
              </span>
            </TableCell>
          </TableRow>
        </TableFooter>
      </table>
    </div>
  )
}
