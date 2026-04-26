'use client'

import { useState } from 'react'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  SupplierLedgerEntry,
  SupplierLedgerTotals,
} from '@/lib/db/modules/suppliers/summary/supplier-summary.actions'
import {
  SupplierAllocationModal,
  PopulatedSupplierPayment,
} from '@/app/admin/management/incasari-si-plati/payables/components/SupplierAllocationModal'
import { getSupplierPaymentById } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { SupplierInvoiceAllocationHistorySheet } from './SupplierInvoiceAllocationHistorySheet'

interface SupplierLedgerTableProps {
  supplierId: string
  data:
    | { entries: SupplierLedgerEntry[]; totals?: SupplierLedgerTotals }
    | never[]
}

export function SupplierLedgerTable({
  supplierId,
  data,
}: SupplierLedgerTableProps) {
  const entries = !Array.isArray(data) && data?.entries ? data.entries : []
  const totals =
    !Array.isArray(data) && data?.totals
      ? data.totals
      : {
          initialDebit: 0,
          initialCredit: 0,
          initialBalance: 0,
          totalDebit: 0,
          totalCredit: 0,
          finalBalance: 0,
        }

  const [selectedInvoiceEntry, setSelectedInvoiceEntry] =
    useState<SupplierLedgerEntry | null>(null)
  const [selectedPayment, setSelectedPayment] =
    useState<PopulatedSupplierPayment | null>(null)

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '—'
    return formatDateTime(new Date(date)).dateOnly
  }

  const handleRowClick = async (entry: SupplierLedgerEntry) => {
    if (
      entry.documentType === 'Plată' ||
      entry.documentType.includes('Plată')
    ) {
      try {
        const res = await getSupplierPaymentById(entry._id)
        if (res.success && res.data) {
          setSelectedPayment(res.data as PopulatedSupplierPayment)
        } else {
          toast.error('Nu s-au putut încărca detaliile plății.')
        }
      } catch {
        toast.error('Eroare la deschiderea plății.')
      }
    } else {
      setSelectedInvoiceEntry(entry)
    }
  }

  if (entries.length === 0) {
    return (
      <div className='flex items-center justify-center h-40'>
        <p className='text-muted-foreground'>
          Nu există tranzacții înregistrate pentru acest furnizor.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className='relative w-full max-h-[500px] overflow-auto border rounded-md'>
        <table className={cn('w-full caption-bottom text-sm')}>
          <TableHeader className='sticky top-0 z-20 bg-background shadow-sm ring-1 ring-border'>
            <TableRow className='bg-muted hover:bg-muted border-none'>
              <TableHead>Document</TableHead>
              <TableHead>Tip Doc.</TableHead>
              <TableHead className='w-[100px]'>Data Doc.</TableHead>
              <TableHead className='w-[100px]'>Scadență</TableHead>
              <TableHead>Detalii</TableHead>
              <TableHead className='text-right'>Debit (Plătit)</TableHead>
              <TableHead className='text-right'>Credit (Facturat)</TableHead>
              <TableHead className='text-right'>Sold Curent</TableHead>
            </TableRow>

            <TableRow className='bg-background hover:bg-background border-b-2'>
              <TableHead
                colSpan={5}
                className='text-left font-bold text-foreground'
              >
                SOLD PRECEDENT LA ÎNCEPUTUL PERIOADEI:
              </TableHead>
              <TableHead className='text-right text-green-600 font-bold'>
                {formatCurrency(totals.initialDebit || 0)}
              </TableHead>
              <TableHead className='text-right text-red-600 font-bold'>
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
                Number(entry.remainingAmount || 0) > 0

              return (
                <TableRow key={index}>
                  <TableCell className='text-muted-foreground '>
                    {entry.documentType}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleRowClick(entry)}
                      className='font-medium hover:underline text-left cursor-pointer'
                      title='Vezi detalii'
                    >
                      {entry.documentNumber}
                    </button>
                  </TableCell>

                  <TableCell>{formatDate(entry.date)}</TableCell>

                  <TableCell
                    className={cn(
                      'text-muted-foreground',
                      isOverdue && 'text-red-600 font-bold',
                    )}
                  >
                    {entry.dueDate ? formatDate(new Date(entry.dueDate)) : '—'}
                  </TableCell>

                  <TableCell
                    className='text-muted-foreground max-w-[200px] truncate'
                    title={entry.details}
                  >
                    {entry.documentNumber.startsWith('INIT-F') ? (
                      Number(entry.credit) > 0 ? (
                        <span className='font-medium text-foreground'>
                          Sold Inițial - Credit
                        </span>
                      ) : (
                        <span className='font-medium text-foreground'>
                          Sold Inițial - Debit
                        </span>
                      )
                    ) : (
                      entry.details
                    )}
                  </TableCell>

                  <TableCell className='text-right font-medium text-green-600'>
                    {entry.debit !== 0 ? formatCurrency(entry.debit) : '—'}
                  </TableCell>

                  <TableCell className='text-right font-medium text-red-600'>
                    {entry.credit !== 0 ? formatCurrency(entry.credit) : '—'}
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
              <TableCell colSpan={5} className='text-right'>
                <span className='font-bold text-lg'>
                  TOTAL RULAJE / SOLD FINAL:
                </span>
              </TableCell>
              <TableCell className='text-right text-green-600'>
                <span className='font-bold text-lg'>
                  {formatCurrency(totals.totalDebit || 0)}
                </span>
              </TableCell>
              <TableCell className='text-right text-red-600'>
                <span className='font-bold text-lg'>
                  {formatCurrency(totals.totalCredit || 0)}
                </span>
              </TableCell>
              <TableCell className='text-right'>
                <span className='font-bold text-lg'>
                  {formatCurrency(totals.finalBalance || 0)}
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </table>
      </div>

      {/* MODALE  */}
      <SupplierInvoiceAllocationHistorySheet
        ledgerEntry={selectedInvoiceEntry}
        onClose={() => setSelectedInvoiceEntry(null)}
      />
      <SupplierAllocationModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </>
  )
}
