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
  data: {
    entries: ClientLedgerEntry[]
    totals: {
      initialBalance: number
      initialDebit: number
      initialCredit: number
      totalDebit: number
      totalCredit: number
      finalBalance: number
    }
  }
  onInvoiceClick: (entry: ClientLedgerEntry) => void
  onPaymentClick: (paymentId: string) => void
  isAdmin: boolean
}

export function ClientLedgerTable({
  clientId,
  data,
  onInvoiceClick,
  onPaymentClick,
  isAdmin,
}: ClientLedgerTableProps) {
  const entries = data?.entries || []
  const totals = data?.totals || {
    initialBalance: 0,
    initialDebit: 0,
    initialCredit: 0,
    totalDebit: 0,
    totalCredit: 0,
    finalBalance: 0,
  }

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
        <TableHeader className='sticky top-0 z-20 bg-background shadow-sm ring-1 ring-border'>
          <TableRow className='bg-muted hover:bg-muted border-none'>
            <TableHead className='w-[120px]'>Data</TableHead>
            <TableHead className='w-[120px]'>Scadență</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Detalii</TableHead>
            <TableHead className='text-right'>Debit (Datorat)</TableHead>
            <TableHead className='text-right'>Credit (Încasat)</TableHead>
            <TableHead className='text-right'>Sold Curent</TableHead>
          </TableRow>

          <TableRow className='bg-background hover:bg-background border-b-2'>
            <TableHead
              colSpan={4}
              className='text-left font-bold text-foreground'
            >
              SOLD PRECEDENT LA ÎNCEPUTUL PERIOADEI:
            </TableHead>
            <TableHead className='text-right text-red-600 font-bold'>
              {formatCurrency(totals.initialDebit || 0)}
            </TableHead>
            <TableHead className='text-right text-green-600 font-bold'>
              {formatCurrency(totals.initialCredit || 0)}
            </TableHead>
            <TableHead className='text-right font-bold text-foreground'>
              {formatCurrency(totals.initialBalance || 0)}
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
                <TableCell
                  className={cn(
                    'text-right font-medium',
                    entry.isRefund ? 'text-red-600' : 'text-green-600',
                  )}
                >
                  {entry.credit !== 0
                    ? entry.isRefund
                      ? `-${formatCurrency(Math.abs(entry.credit))}`
                      : formatCurrency(Math.abs(entry.credit))
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
            <TableCell colSpan={4} className='text-right'>
              <span className='font-bold text-lg'>
                TOTAL RULAJE / SOLD FINAL:
              </span>
            </TableCell>
            <TableCell className='text-right text-red-600 font-bold'>
              {totals.totalDebit !== 0 ? formatCurrency(totals.totalDebit) : 0}
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-bold',
                totals.totalCredit < 0 ? 'text-red-600' : 'text-green-600',
              )}
            >
              {totals.totalCredit !== 0
                ? formatCurrency(totals.totalCredit)
                : '0,00 RON'}
            </TableCell>
            <TableCell className='text-right'>
              <span className='font-bold text-lg'>
                {formatCurrency(totals.finalBalance)}
              </span>
            </TableCell>
          </TableRow>
        </TableFooter>
      </table>
    </div>
  )
}
