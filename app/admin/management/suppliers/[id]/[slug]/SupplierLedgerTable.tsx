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
import { SupplierLedgerEntry } from '@/lib/db/modules/suppliers/summary/supplier-summary.actions'
import {
  SupplierAllocationModal,
  PopulatedSupplierPayment,
} from '@/app/admin/management/incasari-si-plati/payables/components/SupplierAllocationModal'
import { getSupplierPaymentById } from '@/lib/db/modules/financial/treasury/payables/supplier-payment.actions'
import { SupplierInvoiceAllocationHistorySheet } from './SupplierInvoiceAllocationHistorySheet'

interface SupplierLedgerTableProps {
  supplierId: string
  entries: SupplierLedgerEntry[]
}

export function SupplierLedgerTable({
  supplierId,
  entries = [],
}: SupplierLedgerTableProps) {
  const [selectedInvoiceEntry, setSelectedInvoiceEntry] =
    useState<SupplierLedgerEntry | null>(null)
  const [selectedPayment, setSelectedPayment] =
    useState<PopulatedSupplierPayment | null>(null)

  const finalBalance =
    entries.length > 0 ? entries[entries.length - 1].runningBalance : 0

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
      <div className='relative w-full max-h-[450px] overflow-auto border rounded-md'>
        <table className={cn('w-full caption-bottom text-sm')}>
          <TableHeader>
            <TableRow>
              <TableHead className='sticky top-0 bg-muted'>Document</TableHead>
              <TableHead className='sticky top-0 bg-muted'>Tip Doc.</TableHead>
              <TableHead className='sticky top-0 bg-muted w-[100px]'>
                Data Doc.
              </TableHead>
              <TableHead className='sticky top-0 bg-muted w-[100px]'>
                Scadență
              </TableHead>
              <TableHead className='sticky top-0 bg-muted'>Detalii</TableHead>
              <TableHead className='sticky top-0 bg-muted text-right'>
                Debit (Plătit)
              </TableHead>
              <TableHead className='sticky top-0 bg-muted text-right'>
                Credit (Facturat)
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
              <TableCell colSpan={7} className='text-right'>
                <span className='font-bold text-lg'>SOLD FINAL FURNIZOR:</span>
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
