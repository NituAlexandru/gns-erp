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
import { OverdueClientSummary } from '@/lib/db/modules/client/summary/client-summary.types'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { AlertCircle, FileCheck } from 'lucide-react'

interface YearlyOverdueClientsProps {
  data: OverdueClientSummary[]
  year: string
}

export function YearlyOverdueClients({
  data,
  year,
}: YearlyOverdueClientsProps) {
  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  if (!data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-2'>
        {/* 👇 Folosim componenta din Lucide */}
        <FileCheck className='w-8 h-8 text-green-500' />
        <p className='text-sm'>Toți clienții sunt la zi pe {year}!</p>
      </div>
    )
  }

  return (
    <div className='h-full overflow-y-auto '>
      <Accordion type='single' collapsible className='w-full space-y-1'>
        {data.map((client) => (
          <AccordionItem
            value={client._id.toString()}
            key={client._id.toString()}
            className='border rounded-md px-2'
          >
            <AccordionTrigger className='hover:no-underline py-3 cursor-pointer '>
              <div className='flex justify-between w-full items-center gap-2 pr-2'>
                <div className='flex items-center gap-2 overflow-hidden'>
                  <AlertCircle className='w-4 h-4 text-red-500 shrink-0' />
                  <span
                    className='font-semibold truncate'
                    title={client.clientName}
                  >
                    {client.clientName}
                  </span>
                </div>

                <span className='font-bold text-sm text-red-500 whitespace-nowrap  '>
                  {formatCurrency(client.totalOverdue)}
                </span>
              </div>
            </AccordionTrigger>

            <AccordionContent className='pb-1'>
              <div className='pb-0'>
                <Table>
                  <TableHeader>
                    <TableRow className='h-8 hover:bg-transparent border-b-0'>
                      <TableHead className='h-8 text-[10px] uppercase'>
                        Document
                      </TableHead>
                      <TableHead className='h-8 text-[10px] uppercase text-center'>
                        Zile Depasite
                      </TableHead>
                      <TableHead className='h-8 text-[10px] uppercase text-right'>
                        Rest Plata
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.overdueInvoices.map((invoice) => (
                      <TableRow
                        key={invoice._id.toString()}
                        className='h-8 border-b-0 hover:bg-muted/50'
                      >
                        <TableCell className='py-1 text-xs'>
                          <div className='font-medium'>
                            {invoice.seriesName} {' - '}
                            {invoice.invoiceNumber}
                          </div>
                          <div className='text-[10px] text-muted-foreground'>
                            {formatDate(invoice.dueDate)}
                          </div>
                        </TableCell>
                        <TableCell className='py-1 text-xs text-center font-bold text-red-500'>
                          {invoice.daysOverdue}
                        </TableCell>
                        <TableCell className='py-1 text-xs text-right font-medium'>
                          {formatCurrency(invoice.remainingAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
