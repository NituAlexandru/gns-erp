'use client'

import { useRouter } from 'next/navigation'
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
import { formatCurrency, formatDateTime, cn, toSlug } from '@/lib/utils'
import { Building2, CheckCircle2, ExternalLink } from 'lucide-react'
import { ClientBalanceSummary } from '@/lib/db/modules/financial/invoices/invoice.types'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ClientInvoiceDetails } from './ClientInvoiceDetails'

interface ClientBalancesListProps {
  data: ClientBalanceSummary[]
}

export function ClientBalancesList({ data }: ClientBalancesListProps) {
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
        <p className='text-sm'>Nu există solduri active de la clienți.</p>
      </div>
    )
  }

  return (
    <>
      <div className='h-full overflow-y-auto pr-1'>
        <Accordion type='single' collapsible className='w-full space-y-2'>
          {data.map((client) => (
            <AccordionItem
              value={client.clientId}
              key={client.clientId}
              className='border rounded-md px-3 bg-card shadow-sm'
            >
              <AccordionTrigger className='hover:no-underline py-2 cursor-pointer'>
                <div className='flex justify-between w-full items-center gap-4 pr-2'>
                  {/* STÂNGA: Icon + Nume + Count */}
                  <div className='flex items-center gap-3 overflow-hidden text-left'>
                    <div className='p-2 bg-muted rounded-full shrink-0'>
                      <Building2 className='w-4 h-4 text-primary shrink-0' />
                    </div>
                    <div className='flex items-center gap-2'>
                      <span
                        className='font-semibold truncate text-sm sm:text-base hover:text-primary hover:underline transition-colors'
                        title={client.clientName}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(
                            `/clients/${client.clientId}/${toSlug(client.clientName)}?tab=payments`,
                          )
                        }}
                      >
                        {client.clientName}
                      </span>
                      -
                      <span className='text-muted-foreground font-normal text-xs sm:text-sm'>
                        {client.invoicesCount}{' '}
                        {client.invoicesCount === 1 ? 'factură' : 'facturi'}{' '}
                        restante
                      </span>
                    </div>
                  </div>

                  {/* DREAPTA: Suma Totală */}
                  <div className='flex items-center gap-3'>
                    <span
                      className={cn(
                        'font-bold text-sm sm:text-base whitespace-nowrap font-mono',
                        client.totalBalance > 0
                          ? 'text-red-600'
                          : 'text-green-600',
                      )}
                    >
                      {formatCurrency(client.totalBalance)}
                    </span>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className='pb-3 pt-1'>
                <div className='rounded-md border overflow-hidden'>
                  <Table>
                    <TableHeader className='bg-muted/50'>
                      <TableRow className='h-10 hover:bg-transparent border-b-0'>
                        <TableHead className='h-9 text-xs uppercase font-bold text-muted-foreground'>
                          Document
                        </TableHead>
                        <TableHead className='h-9 text-xs uppercase font-bold text-muted-foreground'>
                          Scadență
                        </TableHead>
                        <TableHead className='h-9 text-xs uppercase font-bold text-center text-muted-foreground'>
                          Status / Zile
                        </TableHead>
                        <TableHead className='h-9 text-xs uppercase font-bold text-right text-muted-foreground'>
                          Total Factură
                        </TableHead>
                        <TableHead className='h-9 text-xs uppercase font-bold text-right text-muted-foreground'>
                          Rest Plată
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.invoices.map((invoice) => {
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
                              <div className='text-muted-foreground text-xs'>
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

                            {/* Status / Zile Depășite */}
                            <TableCell className='py-1 text-xs text-center'>
                              {(() => {
                                // 1. ACHITATĂ
                                if (Math.abs(invoice.remainingAmount) < 0.01) {
                                  return (
                                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-500 border border-green-200'>
                                      Achitată
                                    </span>
                                  )
                                }
                                // 2. CREDIT (DE COMPENSAT)
                                if (invoice.remainingAmount < 0) {
                                  return (
                                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 border border-orange-200'>
                                      De compensat
                                    </span>
                                  )
                                }
                                // 3. DEPĂȘITĂ
                                if (invoice.daysOverdue > 0) {
                                  return (
                                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 border border-red-600'>
                                      {invoice.daysOverdue} zile
                                    </span>
                                  )
                                }
                                // 4. ÎN TERMEN
                                return (
                                  <span className='text-muted-foreground text-[10px]'>
                                    În termen
                                  </span>
                                )
                              })()}
                            </TableCell>

                            {/* Total */}
                            <TableCell className='py-1 text-sm text-right text-muted-foreground font-mono'>
                              {formatCurrency(invoice.grandTotal)}
                            </TableCell>

                            {/* Rest */}
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
      <Sheet
        open={!!selectedInvoiceId}
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
      >
        <SheetHeader className='hidden'>
          <SheetTitle>Detalii Factură</SheetTitle>
          <SheetDescription>Preview</SheetDescription>
        </SheetHeader>
        <SheetContent
          side='right'
          className='h-screen flex flex-col overflow-hidden w-[95%] max-w-none sm:w-[95%] md:w-[90%] lg:w-[85%] xl:w-[75%] p-0 gap-0'
        >
          {selectedInvoiceId && (
            <ClientInvoiceDetails
              invoiceId={selectedInvoiceId}
              onClose={() => setSelectedInvoiceId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
