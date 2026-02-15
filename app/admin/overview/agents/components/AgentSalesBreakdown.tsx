'use client'

import { format } from 'date-fns'
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
import { formatCurrency } from '@/lib/utils'
import { InvoicePreviewLazy } from './InvoicePreviewLazy'

export function AgentSalesBreakdown({ data }: { data: any[] }) {
  return (
    <Accordion type='multiple' className='space-y-2 pb-2 cursor-pointer'>
      {data.map((agent) => {
        const profitTotal = agent.totalRevenue - agent.totalCost
        const marginTotal =
          agent.totalRevenue > 0
            ? ((profitTotal / agent.totalRevenue) * 100).toFixed(1)
            : '0'

        return (
          <AccordionItem
            key={agent._id}
            value={agent._id}
            className='border rounded-lg px-4 '
          >
            <AccordionTrigger className='hover:no-underline py-4 cursor-pointer'>
              <div className='flex flex-1 items-center justify-between text-left pr-4'>
                <span className='font-bold text-lg w-1/4'>
                  {agent.agentName}
                </span>
                <div className='flex gap-8 text-xs'>
                  <div>
                    Total:{' '}
                    <span className='font-mono'>
                      {formatCurrency(agent.totalRevenue)}
                    </span>
                  </div>
                  <div>
                    Profit:{' '}
                    <span className='font-mono text-[#16a34a]'>
                      {formatCurrency(profitTotal)} ({marginTotal}%)
                    </span>
                  </div>
                  <div>
                    Cost:{' '}
                    <span className='font-mono text-red-500'>
                      {formatCurrency(agent.totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className='pt-0 pb-4'>
              <div className='rounded-md border  overflow-x-auto'>
                <Table>
                  <TableHeader className=''>
                    <TableRow className='hover:bg-transparent'>
                      <TableHead className='w-[60px] text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Tip
                      </TableHead>
                      <TableHead className='w-[100px] text-[10px] lg:text-xs 2xl:text-sm h-8 text-center'>
                        Serie / Număr
                      </TableHead>
                      <TableHead className='w-[90px] text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Data
                      </TableHead>
                      {/* Coloană mărită */}
                      <TableHead className='min-w-[200px] text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Client
                      </TableHead>
                      <TableHead className='w-[90px] text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Cod Produs
                      </TableHead>
                      {/* Coloană mărită */}
                      <TableHead className='min-w-[250px] text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Nume Produs
                      </TableHead>
                      <TableHead className='w-[50px] text-[10px] lg:text-xs 2xl:text-sm h-8 text-center'>
                        UM
                      </TableHead>
                      <TableHead className='w-[110px] text-right text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Cost Unit.
                      </TableHead>
                      <TableHead className='w-[110px] text-right text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Preț Unit.
                      </TableHead>
                      <TableHead className='w-[110px] text-right text-[10px] lg:text-xs 2xl:text-sm h-8'>
                        Total
                      </TableHead>
                      <TableHead className='w-[90px] text-right text-[10px] lg:text-xs 2xl:text-sm h-8 text-[#16a34a]'>
                        Profit
                      </TableHead>
                      <TableHead className='w-[80px] text-right text-[10px] lg:text-xs 2xl:text-sm h-8 text-[#16a34a]'>
                        % Profit
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.lines.map((line: any, idx: number) => {
                      const isStorno = line.invoiceType === 'STORNO'

                      // 1. CALCUL MARJĂ: Dacă e Storno, afișăm '-', altfel calculăm procentul
                      const rowProfitMargin = isStorno
                        ? '-'
                        : line.lineValue !== 0
                          ? ((line.lineProfit / line.lineValue) * 100).toFixed(
                              1,
                            ) + '%'
                          : '0%'

                      // 2. CULORI: Roșu dacă e Storno sau negativ, Verde dacă e pozitiv
                      const valueColorClass =
                        line.lineValue < 0 || isStorno ? 'text-red-500' : ''
                      const profitColorClass =
                        line.lineProfit < 0 || isStorno
                          ? 'text-red-500'
                          : 'text-[#16a34a]'

                      return (
                        <TableRow
                          key={idx}
                          className='hover:bg-white/5 border-white/5 h-8'
                        >
                          {/* 1. TIP FACTURA */}
                          <TableCell className='py-0 text-[10px] lg:text-xs 2xl:text-sm font-bold'>
                            {isStorno ? (
                              <span className='text-orange-500'>STORNO</span>
                            ) : (
                              <span className='text-blue-400'>FACT</span>
                            )}
                          </TableCell>

                          {/* 2. SERIE / NUMAR */}
                          <TableCell className='py-1 text-[10px] lg:text-sm font-mono w-[150px]'>
                            <div className='flex items-center gap-1'>
                              <InvoicePreviewLazy
                                invoiceId={line._id}
                                isAdmin={true}
                                currentUserRole='admin'
                              />
                              <span className='truncate'>
                                {line.invoiceSeries} - {line.invoiceNumber}
                              </span>
                            </div>
                          </TableCell>

                          {/* 3. DATA */}
                          <TableCell className='py-0 text-[10px] lg:text-xs 2xl:text-sm whitespace-nowrap'>
                            {format(new Date(line.invoiceDate), 'dd.MM.yyyy')}
                          </TableCell>

                          {/* 4. CLIENT */}
                          <TableCell
                            className='py-0 text-[10px] lg:text-xs 2xl:text-sm max-w-[150px] truncate'
                            title={line.clientName}
                          >
                            {line.clientName}
                          </TableCell>

                          {/* 5. COD PRODUS */}
                          <TableCell className='py-0 text-[10px] lg:text-xs 2xl:text-sm font-mono'>
                            {line.productCode || '-'}
                          </TableCell>

                          {/* 6. NUME PRODUS */}
                          <TableCell
                            className='py-0 text-[10px] lg:text-xs 2xl:text-sm max-w-[180px] truncate'
                            title={line.productName}
                          >
                            {line.productName}
                          </TableCell>

                          {/* 7. UM */}
                          <TableCell className='py-0 text-[10px] lg:text-xs 2xl:text-sm text-center'>
                            {line.unitOfMeasure || 'buc'}
                          </TableCell>

                          {/* 8. COST UNITAR (Rămâne informativ, pozitiv vizual, dar marcat roșu dacă e storno) */}
                          <TableCell
                            className={`py-0 text-right font-mono text-[10px] lg:text-xs 2xl:text-sm ${line.isFallback ? 'text-amber-500/90' : ''}`}
                          >
                            {formatCurrency(
                              line.quantity !== 0
                                ? Math.abs(line.costUsed / line.quantity)
                                : 0,
                            )}
                            {line.isFallback && (
                              <span className='text-[10px] block leading-none opacity-80'>
                                ESTIMAT
                              </span>
                            )}
                          </TableCell>

                          {/* 7. PRET UNITAR */}
                          <TableCell className='py-0 text-right font-mono text-[10px] lg:text-xs 2xl:text-sm'>
                            {formatCurrency(line.unitPrice)}
                          </TableCell>

                          {/* 9. TOTAL (Roșu dacă e negativ/Storno) */}
                          <TableCell
                            className={`py-0 text-right font-mono text-[10px] lg:text-xs 2xl:text-sm ${valueColorClass}`}
                          >
                            {formatCurrency(line.lineValue)}
                          </TableCell>

                          {/* 10. PROFIT (Roșu dacă e negativ/Storno) */}
                          <TableCell
                            className={`py-0 text-right font-mono text-[10px] lg:text-xs 2xl:text-sm font-bold ${profitColorClass}`}
                          >
                            {formatCurrency(line.lineProfit)}
                          </TableCell>

                          {/* 11. PROFIT % (Ascuns/Liniuță dacă e Storno) */}
                          <TableCell
                            className={`py-0 text-right font-mono text-[10px] lg:text-xs 2xl:text-sm ${profitColorClass}`}
                          >
                            {rowProfitMargin}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
