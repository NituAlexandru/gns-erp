import { memo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Loader2 } from 'lucide-react'
import { formatCurrency, formatDateTime, cn, toSlug } from '@/lib/utils'
import {
  INVOICE_STATUS_MAP,
  InvoiceStatusKey,
} from '@/lib/db/modules/financial/invoices/invoice.constants'
import {
  CLIENT_PAYMENT_STATUS_MAP,
  ClientPaymentStatus,
} from '@/lib/db/modules/financial/treasury/receivables/client-payment.constants'
import { TIMEZONE } from '@/lib/constants'
import { toZonedTime } from 'date-fns-tz'
import { getNextBusinessDay, isBusinessDay } from '@/lib/deliveryDates'
import { addDays, startOfDay } from 'date-fns'

const formatDate = (date: Date | string) =>
  formatDateTime(new Date(date)).dateOnly

export const ClientBalanceItem = memo(function ClientBalanceItem({
  client,
  isAdmin,
  onOpenDetails,
  onOpenPayment,
  onOpenAllocation,
  onOpenPenalty,
  onCompensate,
  onApprove,
  processingId,
  isPending,
}: {
  client: any
  isAdmin: boolean
  onOpenDetails: (id: string) => void
  onOpenPayment: (data: any) => void
  onOpenAllocation: (payment: any) => void
  onOpenPenalty: (data: any) => void
  onCompensate: (id: string) => void
  onApprove: (id: string) => void
  processingId: string | null
  isPending: boolean
}) {
  const router = useRouter()

  return (
    <AccordionItem
      value={client.clientId}
      className='border rounded-md px-3 bg-card shadow-sm'
    >
      <AccordionTrigger className='hover:no-underline py-0 cursor-pointer'>
        <div className='flex justify-between w-full items-center gap-4 pr-2'>
          <div className='flex items-center gap-3 overflow-hidden text-left w-[200px] sm:w-[300px] lg:w-[400px] shrink-0'>
            <div className='p-2 bg-muted rounded-full shrink-0'>
              <Building2 className='w-4 h-4 text-primary shrink-0' />
            </div>
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
          </div>

          <div className='hidden md:flex items-center justify-start flex-1 gap-x-2 text-xs sm:text-sm shrink-0'>
            <span className='text-muted-foreground whitespace-nowrap'>
              {client.invoicesCount}{' '}
              {client.invoicesCount === 1 ? 'factură' : 'facturi'}
            </span>
            {client.overdueCount > 0 && (
              <span className='text-red-500/90 font-medium whitespace-nowrap'>
                ({client.overdueCount}{' '}
                {client.overdueCount === 1 ? 'restantă' : 'restante'})
              </span>
            )}
            {client.paymentsCount > 0 && (
              <span className='text-green-500/90 font-medium whitespace-nowrap ml-2'>
                ({client.paymentsCount}{' '}
                {client.paymentsCount === 1
                  ? 'plată nealocată'
                  : 'plăți nealocate'}
                )
              </span>
            )}
            {client.compensationsCount > 0 && (
              <span className='text-red-500/90 font-medium whitespace-nowrap ml-2'>
                ({client.compensationsCount}{' '}
                {client.compensationsCount === 1
                  ? 'compensare disponibilă'
                  : 'compensări disponibile'}
                )
              </span>
            )}
          </div>

          {client.totalPenalties > 0 && (
            <div className='flex items-center gap-3 px-4 border-r border-text-muted-foreground'>
              <div className='flex flex-col items-end'>
                <span className='text-[10px] uppercase text-muted-foreground font-bold'>
                  Penalități Totale
                </span>
                <div className='flex items-center gap-2'>
                  {client.totalPenalties < 100 && (
                    <span
                      className='text-xs px-1.5 py-0 rounded bg-orange-100 text-orange-700 font-bold whitespace-nowrap cursor-help'
                      title='Facturarea automată se va declanșa doar când suma atinge minim 100,00 RON'
                    >
                      Așteaptă suma totala de min. 100,00 RON
                    </span>
                  )}
                  <span className='font-mono font-bold text-red-600 text-sm'>
                    {formatCurrency(client.totalPenalties)}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div
                  className='inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3'
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpenPenalty({
                      clientId: client.clientId,
                      clientName: client.clientName,
                      items: client.items,
                    })
                  }}
                >
                  Facturează Penalități
                </div>
              )}
            </div>
          )}

          <div className='flex items-center justify-end shrink-0 w-[120px] sm:w-[150px]'>
            <span
              className={cn(
                'font-bold text-sm sm:text-base whitespace-nowrap font-mono',
                client.totalBalance > 0 ? 'text-red-600' : 'text-green-600',
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
                <TableHead className='h-9 text-xs uppercase font-bold text-center text-muted-foreground'>
                  Status
                </TableHead>
                <TableHead className='h-9 text-xs uppercase font-bold text-muted-foreground'>
                  Scadență
                </TableHead>
                <TableHead className='h-9 text-xs uppercase font-bold text-center text-muted-foreground'>
                  Status / Zile
                </TableHead>
                <TableHead className='h-9 text-xs uppercase font-bold text-center text-muted-foreground'>
                  Zile Pen. Facturate
                </TableHead>
                {isAdmin && (
                  <TableHead className='h-9 text-xs uppercase font-bold text-muted-foreground'>
                    Acțiuni
                  </TableHead>
                )}
                <TableHead className='h-9 text-[10px] uppercase font-bold text-center text-red-600 bg-red-50/30'>
                  % Cotă
                </TableHead>
                <TableHead className='h-9 text-[10px] uppercase font-bold text-right text-red-600 bg-red-50/30'>
                  Penalitate
                </TableHead>
                <TableHead className='h-9 text-[10px] uppercase font-bold text-center text-red-600 bg-red-50/30'>
                  Urm. Facturare
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
              {client.items.map((item: any) => {
                if (item.type === 'PAYMENT') {
                  const statusInfo =
                    CLIENT_PAYMENT_STATUS_MAP[
                      item.status as ClientPaymentStatus
                    ]
                  return (
                    <TableRow
                      key={`pay-${item._id}`}
                      className={cn(
                        'h-10 border-b-0 hover:bg-muted/50 transition-colors relative',
                        processingId === item._id &&
                          'opacity-40 pointer-events-none bg-muted/50',
                      )}
                    >
                      <TableCell className='py-1 text-xs'>
                        <div className='font-medium text-foreground w-fit'>
                          {item.grandTotal < 0 && (
                            <span className='text-primary font-bold mr-1'>
                              RESTITUIRE
                            </span>
                          )}
                          - {item.seriesName ? `${item.seriesName} - ` : ''}
                          {item.documentNumber}
                        </div>
                        <div
                          className={cn(
                            'text-xs',
                            item.grandTotal < 0
                              ? 'text-primary'
                              : 'text-green-500',
                          )}
                        >
                          {item.grandTotal < 0
                            ? 'Restituire din '
                            : 'Încasare din '}
                          {formatDate(item.date)}
                        </div>
                      </TableCell>
                      <TableCell className='py-1 text-xs text-center'>
                        {statusInfo ? (
                          <Badge
                            variant={statusInfo.variant}
                            className='h-5 text-xs px-1 whitespace-nowrap'
                          >
                            {statusInfo.name}
                          </Badge>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </TableCell>
                      <TableCell className='py-1 text-xs text-muted-foreground'>
                        -
                      </TableCell>
                      <TableCell className='py-1 text-xs text-center'>
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-600 border border-green-200'>
                          {item.daysOverdue} zile nealocată
                        </span>
                      </TableCell>
                      <TableCell className='py-1 text-center text-muted-foreground'></TableCell>
                      {isAdmin && (
                        <TableCell className='py-1'>
                          {item.grandTotal < 0 ? (
                            <Button
                              type='button'
                              variant='outline'
                              disabled={isPending}
                              className='h-7 text-xs px-2 cursor-pointer text-primary border-primary-200 hover:bg-primary-50/50'
                              onClick={(e) => {
                                e.preventDefault()
                                onOpenAllocation({
                                  ...item,
                                  unallocatedAmount: item.remainingAmount,
                                  isRefund: true,
                                  clientId: {
                                    _id: client.clientId,
                                    name: client.clientName,
                                  },
                                })
                              }}
                            >
                              Stinge Avans
                            </Button>
                          ) : (
                            <Button
                              type='button'
                              variant='outline'
                              disabled={isPending}
                              className='h-7 text-xs px-2 cursor-pointer'
                              onClick={(e) => {
                                e.preventDefault()
                                onOpenAllocation(item)
                              }}
                            >
                              Alocare
                            </Button>
                          )}
                        </TableCell>
                      )}
                      <TableCell className='py-1 text-center text-muted-foreground'></TableCell>
                      <TableCell className='py-1 text-center text-muted-foreground'></TableCell>
                      <TableCell className='py-1 text-center text-muted-foreground'></TableCell>
                      <TableCell className='py-1 text-sm text-right font-mono text-red-600'>
                        {item.grandTotal < 0
                          ? `-${formatCurrency(Math.abs(item.grandTotal))}`
                          : `-${formatCurrency(item.grandTotal)}`}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-1 text-sm text-right font-bold font-mono',
                          item.remainingAmount < 0
                            ? 'text-green-600'
                            : 'text-green-600',
                        )}
                      >
                        {item.remainingAmount < 0
                          ? `+${formatCurrency(Math.abs(item.remainingAmount))}`
                          : `-${formatCurrency(item.remainingAmount)}`}
                      </TableCell>
                    </TableRow>
                  )
                }

                const isOverdue = item.daysOverdue > 0
                const statusInfoInv =
                  INVOICE_STATUS_MAP[item.status as InvoiceStatusKey]

                return (
                  <TableRow
                    key={`inv-${item._id}`}
                    className={cn(
                      'h-10 border-b-0 hover:bg-primary/10 transition-colors relative',
                      processingId === item._id &&
                        'opacity-40 pointer-events-none bg-primary/10',
                    )}
                  >
                    <TableCell className='py-1 text-xs'>
                      <div
                        className='font-medium text-foreground cursor-pointer hover:underline hover:text-primary transition-colors w-fit'
                        onClick={() => onOpenDetails(item._id)}
                      >
                        {item.seriesName ? `${item.seriesName} - ` : ''}
                        {item.documentNumber}
                      </div>
                      <div className='text-primary text-xs'>
                        Factură din {formatDate(item.date)}
                      </div>
                    </TableCell>
                    <TableCell className='py-1 text-xs text-center'>
                      {statusInfoInv ? (
                        <Badge
                          variant={statusInfoInv.variant}
                          className='h-5 text-xs px-1'
                        >
                          {statusInfoInv.name}
                        </Badge>
                      ) : (
                        <span className='text-muted-foreground'>-</span>
                      )}
                    </TableCell>
                    <TableCell className='py-1 text-xs'>
                      <span
                        className={isOverdue ? 'text-red-600 font-medium' : ''}
                      >
                        {formatDate(item.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell className='py-1 text-xs text-center'>
                      {item.daysOverdue > 0 ? (
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 border border-red-600'>
                          {item.daysOverdue} zile
                        </span>
                      ) : (
                        <span className='text-muted-foreground text-[10px]'>
                          În termen
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='py-1 text-xs text-center'>
                      {item.billedPenaltyDays > 0 ? (
                        <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 border border-orange-200'>
                          {item.billedPenaltyDays} zile
                        </span>
                      ) : (
                        <span className='text-muted-foreground text-[10px]'>
                          -
                        </span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className='py-1'>
                        <div className='flex items-center gap-2'>
                          <Button
                            variant='outline'
                            disabled={isPending}
                            className='h-7 text-xs px-2 cursor-pointer'
                            onClick={() => onOpenDetails(item._id)}
                          >
                            Detalii
                          </Button>
                          {['APPROVED', 'PARTIAL_PAID'].includes(
                            item.status,
                          ) ? (
                            <>
                              {item.remainingAmount > 0 && (
                                <Button
                                  variant='outline'
                                  disabled={isPending}
                                  className='h-7 text-xs px-2 cursor-pointer'
                                  onClick={() =>
                                    onOpenPayment({
                                      clientId: client.clientId,
                                      clientName: client.clientName,
                                      invoiceId: item._id,
                                      amount: item.remainingAmount,
                                      notes: `Plată factură ${item.seriesName ? item.seriesName + '-' : ''}${item.documentNumber}`,
                                    })
                                  }
                                >
                                  Încasare
                                </Button>
                              )}
                              {item.remainingAmount < 0 && (
                                <Button
                                  variant='outline'
                                  disabled={
                                    processingId === item._id || isPending
                                  }
                                  className='h-7 text-xs px-2 cursor-pointer text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50'
                                  onClick={() => onCompensate(item._id)}
                                >
                                  {processingId === item._id ? (
                                    <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                                  ) : null}
                                  Compensează
                                </Button>
                              )}
                            </>
                          ) : isAdmin ? (
                            <Button
                              variant='default'
                              disabled={isPending}
                              className='h-7 text-xs px-2 cursor-pointer'
                              onClick={() => onApprove(item._id)}
                            >
                              {isPending && (
                                <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                              )}{' '}
                              Aprobă Factura
                            </Button>
                          ) : (
                            <span className='text-[10px] text-muted-foreground font-medium italic'>
                              În așteptare aprobare
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className='py-1 text-xs text-center font-bold font-mono text-primary bg-red-50/10'>
                      {item.type === 'INVOICE' && item.penaltyAmount > 0
                        ? `${item.appliedPercentage}%`
                        : ''}
                    </TableCell>
                    <TableCell className='py-1 text-xs text-right font-mono font-bold text-primary bg-red-50/10'>
                      {item.type === 'INVOICE' && item.penaltyAmount > 0
                        ? formatCurrency(item.penaltyAmount)
                        : ''}
                    </TableCell>
                    <TableCell className='py-1 text-xs font-bold text-center text-primary bg-red-50/10'>
                      {(() => {
                        if (
                          item.type === 'INVOICE' &&
                          (!item.penaltyAmount || item.penaltyAmount <= 0) &&
                          item.daysOverdue > 0 &&
                          item.billedPenaltyDays > 0
                        ) {
                          const formattedUpTo = item.lastBilledDate
                            ? formatDate(item.lastBilledDate)
                            : ''
                          return (
                            <span
                              className='text-xs text-green-600 font-bold whitespace-nowrap cursor-help'
                              title={`Penalitatile sunt Facturate până la data de ${formattedUpTo}`}
                            >
                              Facturată la zi
                            </span>
                          )
                        }
                        if (
                          !item.penaltyAmount ||
                          item.penaltyAmount <= 0 ||
                          !item.nextBillingDate
                        )
                          return ''
                        if (client.totalPenalties < 100) {
                          return (
                            <span
                              className='text-[10px] text-muted-foreground italic cursor-help border-b border-dashed border-muted-foreground/50 pb-0.5'
                              title='Total sub 100,00 RON'
                            >
                              Total sub 100,00 RON
                            </span>
                          )
                        }
                        const nextDate = new Date(item.nextBillingDate)
                        const now = new Date()
                        if (nextDate <= now) {
                          const romaniaTime = toZonedTime(now, TIMEZONE)
                          const currentHour = romaniaTime.getHours()
                          if (isBusinessDay(now) && currentHour < 18) {
                            return (
                              <span className='font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap'>
                                Azi, ora 18:00
                              </span>
                            )
                          }
                          const nextRunDate = getNextBusinessDay(
                            addDays(now, 1),
                          )
                          if (
                            startOfDay(nextRunDate).getTime() ===
                            startOfDay(addDays(now, 1)).getTime()
                          ) {
                            return (
                              <span className='font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap'>
                                Mâine, ora 18:00
                              </span>
                            )
                          }
                          const dayNames = [
                            'Duminică',
                            'Luni',
                            'Marți',
                            'Miercuri',
                            'Joi',
                            'Vineri',
                            'Sâmbătă',
                          ]
                          return (
                            <span className='font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap'>
                              {dayNames[nextRunDate.getDay()]}, ora 18:00
                            </span>
                          )
                        }
                        return formatDate(item.nextBillingDate)
                      })()}
                    </TableCell>
                    <TableCell className='py-1 text-sm text-right text-muted-foreground font-mono'>
                      {formatCurrency(item.grandTotal)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'py-1 text-sm text-right font-bold font-mono',
                        item.remainingAmount > 0
                          ? 'text-red-600'
                          : 'text-green-600',
                      )}
                    >
                      {formatCurrency(item.remainingAmount)}
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
})
