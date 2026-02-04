'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SupplierBalanceSummary } from '@/lib/db/modules/financial/treasury/payables/supplier-invoice.actions'
import { formatCurrency, formatDateTime, cn, toSlug } from '@/lib/utils'
import { Building2, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SupplierInvoiceDetailSheet } from './SupplierInvoiceDetailSheet'

interface SupplierBalancesListProps {
  data: SupplierBalanceSummary[]
}

export function SupplierBalancesList({ data }: SupplierBalancesListProps) {
  const router = useRouter()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  )

  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  if (!data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-40 text-muted-foreground gap-2'>
        <CheckCircle2 className='w-8 h-8 text-green-500' />
        <p className='text-sm'>Nu există solduri active către furnizori.</p>
      </div>
    )
  }

  return (
    <>
      <div className='h-full overflow-y-auto pr-1'>
        <Accordion type='single' collapsible className='w-full space-y-2'>
          {data.map((supplier) => (
            <AccordionItem
              value={supplier.supplierId}
              key={supplier.supplierId}
              className='border rounded-md px-3 bg-card shadow-sm'
            >
              <AccordionTrigger className='hover:no-underline py-2 cursor-pointer'>
                <div className='flex justify-between w-full items-center gap-4 pr-2'>
                  <div className='flex items-center gap-3 overflow-hidden text-left'>
                    <div className='p-2 bg-muted rounded-full shrink-0'>
                      <Building2 className='w-4 h-4 text-primary shrink-0' />
                    </div>
                    <div className='flex items-center gap-2'>
                      <span
                        className='font-semibold truncate text-sm sm:text-base hover:text-primary hover:underline transition-colors'
                        title={supplier.supplierName}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(
                            `/admin/management/suppliers/${supplier.supplierId}/${toSlug(supplier.supplierName)}?tab=payments`,
                          )
                        }}
                      >
                        {supplier.supplierName}
                      </span>
                      -
                      <span className='text-muted-foreground font-normal'>
                        {supplier.invoicesCount}{' '}
                        {supplier.invoicesCount === 1 ? 'factură' : 'facturi'}{' '}
                        restante
                      </span>
                    </div>
                  </div>

                  {/* Partea Dreaptă: Suma Totală + Buton Link */}
                  <div className='flex items-center gap-3'>
                    <span
                      className={cn(
                        'font-bold text-sm sm:text-base whitespace-nowrap',
                        supplier.totalBalance > 0
                          ? 'text-red-600'
                          : 'text-green-600',
                      )}
                    >
                      {formatCurrency(supplier.totalBalance)}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className='pb-3 pt-1'>
                <div className='rounded-md border overflow-hidden'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow className='h-9 hover:bg-transparent border-b-0'>
                        <TableHead className='h-9 text-sm uppercase font-bold text-muted-foreground'>
                          Document
                        </TableHead>
                        <TableHead className='h-9 text-sm uppercase font-bold text-muted-foreground'>
                          Scadență
                        </TableHead>
                        <TableHead className='h-9 text-sm uppercase font-bold text-center text-muted-foreground'>
                          Zile Depășite
                        </TableHead>
                        <TableHead className='h-9 text-sm uppercase font-bold text-right text-muted-foreground'>
                          Total Factură
                        </TableHead>
                        <TableHead className='h-9 text-sm uppercase font-bold text-right text-muted-foreground'>
                          Rest Plată
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.invoices.map((invoice) => {
                        const isOverdue = invoice.daysOverdue > 0
                        return (
                          <TableRow
                            key={invoice._id}
                            className='h-10 border-b-0 hover:bg-muted/50 transition-colors'
                          >
                            {/* Document */}
                            <TableCell className='py-1 text-xs'>
                              <div
                                className='font-medium text-foreground cursor-pointer hover:underline hover:text-primary transition-colors w-fit'
                                onClick={() =>
                                  setSelectedInvoiceId(invoice._id)
                                }
                              >
                                {invoice.seriesName
                                  ? `${invoice.seriesName} - `
                                  : ''}
                                {invoice.invoiceNumber}
                              </div>
                              <div className=' text-muted-foreground'>
                                din data de {formatDate(invoice.invoiceDate)}
                              </div>
                            </TableCell>

                            {/* Scadență */}
                            <TableCell className='py-1 text-xs'>
                              <span
                                className={
                                  isOverdue ? 'text-red-600 font-medium' : ''
                                }
                              >
                                {formatDate(invoice.dueDate)}
                              </span>
                            </TableCell>

                            {/* Zile Depășite */}
                            <TableCell className='py-1 text-xs text-center'>
                              {(() => {
                                // CAZ 1: Factura e stinsă (0 lei rest de plată)

                                if (Math.abs(invoice.remainingAmount) < 0.01) {
                                  return (
                                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-500 border border-green-200'>
                                      Achitată
                                    </span>
                                  )
                                }

                                // CAZ 2: Factura e negativă (Credit)
                                if (invoice.remainingAmount < 0) {
                                  return (
                                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 border border-orange-200'>
                                      De compensat
                                    </span>
                                  )
                                }

                                // CAZ 3: Factura e pozitivă și depășită
                                if (invoice.daysOverdue > 0) {
                                  return (
                                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 border border-red-600'>
                                      {invoice.daysOverdue} zile
                                    </span>
                                  )
                                }

                                // CAZ 4: Factura e pozitivă dar în termen
                                return (
                                  <span className='text-muted-foreground text-[10px]'>
                                    În termen
                                  </span>
                                )
                              })()}
                            </TableCell>

                            {/* Total Factură */}
                            <TableCell className='py-1 text-sm text-right text-muted-foreground font-mono'>
                              {formatCurrency(invoice.grandTotal)}
                            </TableCell>

                            {/* Rest Plată */}
                            <TableCell
                              className={cn(
                                'py-1 text-sm text-right font-bold font-mono',
                                invoice.remainingAmount > 0
                                  ? 'text-red-600'
                                  : 'text-green-600',
                              )}
                            >
                              {formatCurrency(invoice.remainingAmount)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <SupplierInvoiceDetailSheet
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </>
  )
}
