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
import { ClientLedgerEntry } from '@/lib/db/modules/client/summary/client-summary.types'
import { cn } from '@/lib/utils'

interface ClientLedgerTableProps {
  clientId: string
  entries: ClientLedgerEntry[]
  onInvoiceClick: (entry: ClientLedgerEntry) => void
  onPaymentClick: (paymentId: string) => void
  isAdmin: boolean
}

export function ClientLedgerTable({
  clientId,
  entries = [],
  onInvoiceClick,
  onPaymentClick,
  isAdmin,
}: ClientLedgerTableProps) {
  // Calculăm soldul final pe loc (nu mai folosim state)
  const finalBalance =
    entries.length > 0 ? entries[entries.length - 1].runningBalance : 0

  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

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
            const isOverdue =
              entry.dueDate &&
              new Date(entry.dueDate).getTime() < new Date().getTime() &&
              Number(entry.remainingAmount) > 0

            return (
              <TableRow key={index}>
                <TableCell>{formatDate(entry.date)}</TableCell>
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
                    >
                      {entry.documentNumber}
                    </button>
                  ) : (
                    <span className='font-medium'>{entry.documentNumber}</span>
                  )}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {entry.documentNumber.startsWith('INIT-C')
                    ? entry.debit > 0
                      ? 'Sold Inițial - Debit'
                      : 'Sold Inițial - Credit'
                    : entry.details}
                </TableCell>
                <TableCell className='text-right font-medium text-red-600'>
                  {entry.debit !== 0 ? formatCurrency(entry.debit) : '—'}
                </TableCell>
                <TableCell className='text-right font-medium text-green-600'>
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
