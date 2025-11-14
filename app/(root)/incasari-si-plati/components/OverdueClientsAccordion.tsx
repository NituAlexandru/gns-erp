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
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { OverdueClientSummary } from '@/lib/db/modules/financial/treasury/summary/summary.types'

interface OverdueClientsAccordionProps {
  data: OverdueClientSummary[]
}

export function OverdueClientsAccordion({
  data,
}: OverdueClientsAccordionProps) {
  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center h-40'>
        <p className='text-muted-foreground'>
          Niciun client cu facturi restante.
        </p>
      </div>
    )
  }

  return (
    <div className='max-h-[400px] overflow-y-auto p-0 pr-3'>
      <Accordion type='single' collapsible className='w-full'>
        {data.map((client) => (
          <AccordionItem
            value={client._id.toString()}
            key={client._id.toString()}
          >
            {/* Capul de tabel al Acordeonului (Clientul) */}
            <AccordionTrigger className='hover:no-underline'>
              <div className='flex justify-between w-full'>
                <span
                  className='font-bold text-base truncate'
                  title={client.clientName}
                >
                  {client.clientName}
                </span>
                <span className='font-bold text-base text-red-600'>
                  {formatCurrency(client.totalOverdue)}
                </span>
              </div>
            </AccordionTrigger>

            {/* Conținutul (Lista de facturi) */}
            <AccordionContent>
              <div className=' space-y-1'>
                <Table>
                  <TableHeader>
                    <TableRow className='text-xs'>
                      <TableHead>Factura</TableHead>
                      <TableHead>Scadentă</TableHead>
                      <TableHead className='text-center'>
                        Zile Întârziere
                      </TableHead>
                      <TableHead className='text-right'>Restant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.overdueInvoices.map((invoice) => (
                      <TableRow
                        key={invoice._id.toString()}
                        className='text-sm'
                      >
                        <TableCell className='font-medium'>
                          {invoice.seriesName}-{invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell className='text-center font-bold text-red-600'>
                          {invoice.daysOverdue}
                        </TableCell>
                        <TableCell className='text-right font-medium'>
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
