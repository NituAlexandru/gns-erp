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
import { Building2, CheckCircle2, Loader2 } from 'lucide-react'
import { ClientBalanceSummary } from '@/lib/db/modules/financial/invoices/invoice.types'
import { useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ClientInvoiceDetails } from './ClientInvoiceDetails'
import { Button } from '@/components/ui/button'
import { AllocationModal } from './AllocationModal'
import { CreateClientPaymentForm } from './CreateClientPaymentForm'
import { createCompensationPayment } from '@/lib/db/modules/financial/treasury/receivables/payment-allocation.actions'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  INVOICE_STATUS_MAP,
  InvoiceStatusKey,
} from '@/lib/db/modules/financial/invoices/invoice.constants'
import {
  CLIENT_PAYMENT_STATUS_MAP,
  ClientPaymentStatus,
} from '@/lib/db/modules/financial/treasury/receivables/client-payment.constants'
import { approveInvoice } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { TIMEZONE } from '@/lib/constants'
import { toZonedTime } from 'date-fns-tz'
import { PenaltyBillingModal } from '../penalties/PenaltyBillingModal'
import { getNextBusinessDay, isBusinessDay } from '@/lib/deliveryDates'
import { addDays, startOfDay } from 'date-fns'

interface ClientBalancesListProps {
  data: ClientBalanceSummary[]
  isAdmin?: boolean
  currentUser?: { id: string; name?: string | null }
}

export function ClientBalancesList({
  data,
  isAdmin = false,
  currentUser,
}: ClientBalancesListProps) {
  const router = useRouter()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  )
  const [paymentModalData, setPaymentModalData] = useState<{
    clientId: string
    clientName: string
    invoiceId?: string
    amount?: number
    notes?: string
  } | null>(null)

  const [allocationModalPayment, setAllocationModalPayment] = useState<
    any | null
  >(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [penaltyModalData, setPenaltyModalData] = useState<{
    clientId: string
    clientName: string
    items: any[]
  } | null>(null)

  const formatDate = (date: Date | string) =>
    formatDateTime(new Date(date)).dateOnly

  const handleCompensate = async (invoiceId: string) => {
    if (!currentUser?.id) {
      toast.error('Eroare: Utilizator neidentificat.')
      return
    }

    setProcessingId(invoiceId)
    try {
      const result = await createCompensationPayment(
        invoiceId,
        currentUser.id,
        currentUser.name || 'Operator',
      )

      if (result.success) {
        toast.success(result.message)
        startTransition(() => {
          router.refresh()
        })
      } else {
        toast.error('Eroare:', { description: result.message })
      }
    } catch {
      toast.error('A apărut o eroare neașteptată.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleApprove = (invoiceId: string) => {
    if (!isAdmin) {
      toast.error('Eroare: Doar administratorii pot aproba facturi.')
      return
    }

    startTransition(async () => {
      const result = await approveInvoice(invoiceId)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare la aprobare', { description: result.message })
      }
    })
  }

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
        <Accordion type='single' collapsible className='w-full space-y-1.5'>
          {data.map((client) => (
            <AccordionItem
              value={client.clientId}
              key={client.clientId}
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

                  {/* 2. CENTRU: Contoare  */}
                  <div className='hidden md:flex items-center justify-start flex-1 gap-x-2 text-xs sm:text-sm shrink-0'>
                    {/* Contor Facturi */}
                    <span className='text-muted-foreground whitespace-nowrap'>
                      {client.invoicesCount}{' '}
                      {client.invoicesCount === 1 ? 'factură' : 'facturi'}
                    </span>

                    {/* Contor Restanțe */}
                    {client.overdueCount > 0 && (
                      <span className='text-red-500/90 font-medium whitespace-nowrap'>
                        ({client.overdueCount}{' '}
                        {client.overdueCount === 1 ? 'restantă' : 'restante'})
                      </span>
                    )}

                    {/* Contor Plăți Nealocate */}
                    {client.paymentsCount > 0 && (
                      <span className='text-green-500/90 font-medium whitespace-nowrap ml-2'>
                        ({client.paymentsCount}{' '}
                        {client.paymentsCount === 1
                          ? 'plată nealocată'
                          : 'plăți nealocate'}
                        )
                      </span>
                    )}
                    {/* Contor Compensari */}
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
                        <span className='font-mono font-bold text-red-600 text-sm'>
                          {formatCurrency(client.totalPenalties)}
                        </span>
                      </div>{' '}
                      {isAdmin && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='h-7 text-xs'
                          asChild
                        >
                          <span
                            onClick={(e) => {
                              e.preventDefault() // Previne alte acțiuni default
                              e.stopPropagation() // Oprește deschiderea acordeonului
                              setPenaltyModalData({
                                clientId: client.clientId,
                                clientName: client.clientName,
                                items: client.items,
                              })
                            }}
                          >
                            Facturează Penalități
                          </span>
                        </Button>
                      )}
                    </div>
                  )}

                  {/* 3. DREAPTA: Suma Totală */}
                  <div className='flex items-center justify-end shrink-0 w-[120px] sm:w-[150px]'>
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
                      {(client as any).items.map((item: any) => {
                        // --- 1. RANDARE PENTRU PLĂȚI ---
                        if (item.type === 'PAYMENT') {
                          return (
                            <TableRow
                              key={`pay-${item._id}`}
                              className='h-10 border-b-0 hover:bg-muted/50 transition-color'
                            >
                              <TableCell className='py-1 text-xs'>
                                <div className='font-medium text-foreground w-fit'>
                                  {item.seriesName
                                    ? `${item.seriesName} - `
                                    : ''}
                                  {item.documentNumber}
                                </div>
                                <div className='text-xs text-green-500'>
                                  Plată din {formatDate(item.date)}
                                </div>
                              </TableCell>
                              <TableCell className='py-1 text-xs text-center'>
                                {(() => {
                                  const statusInfo =
                                    CLIENT_PAYMENT_STATUS_MAP[
                                      item.status as ClientPaymentStatus
                                    ]

                                  if (statusInfo) {
                                    return (
                                      <Badge
                                        variant={statusInfo.variant}
                                        className='h-5 text-xs px-1 whitespace-nowrap'
                                      >
                                        {statusInfo.name}
                                      </Badge>
                                    )
                                  }

                                  return (
                                    <span className='text-muted-foreground'>
                                      -
                                    </span>
                                  )
                                })()}
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
                                  <Button
                                    variant='outline'
                                    className='h-7 text-xs px-2 cursor-pointer'
                                    onClick={() =>
                                      setAllocationModalPayment(item)
                                    }
                                  >
                                    Alocare
                                  </Button>
                                </TableCell>
                              )}
                              <TableCell className='py-1 text-center text-muted-foreground'></TableCell>
                              <TableCell className='py-1 text-center text-muted-foreground'></TableCell>
                              <TableCell className='py-1 text-center text-muted-foreground'></TableCell>
                              <TableCell className='py-1 text-sm text-right font-mono text-green-600'>
                                -{formatCurrency(item.grandTotal)}
                              </TableCell>

                              <TableCell className='py-1 text-sm text-right font-bold font-mono text-green-600'>
                                -{formatCurrency(item.remainingAmount)}
                              </TableCell>
                            </TableRow>
                          )
                        }

                        // --- 2. RANDARE PENTRU FACTURI ---
                        const isOverdue = item.daysOverdue > 0
                        return (
                          <TableRow
                            key={`inv-${item._id}`}
                            className='h-10 border-b-0 hover:bg-muted/50 transition-colors'
                          >
                            <TableCell className='py-1 text-xs'>
                              <div
                                className='font-medium text-foreground cursor-pointer hover:underline hover:text-primary transition-colors w-fit'
                                onClick={() => setSelectedInvoiceId(item._id)}
                              >
                                {item.seriesName ? `${item.seriesName} - ` : ''}
                                {item.documentNumber}
                              </div>
                              <div className='text-primary text-xs'>
                                Factură din {formatDate(item.date)}
                              </div>
                            </TableCell>
                            <TableCell className='py-1 text-xs text-center'>
                              {(() => {
                                const statusInfo =
                                  INVOICE_STATUS_MAP[
                                    item.status as InvoiceStatusKey
                                  ]
                                if (statusInfo) {
                                  return (
                                    <Badge
                                      variant={statusInfo.variant}
                                      className='h-5 text-xs px-1'
                                    >
                                      {statusInfo.name}
                                    </Badge>
                                  )
                                }
                                return (
                                  <span className='text-muted-foreground'>
                                    -
                                  </span>
                                )
                              })()}
                            </TableCell>
                            <TableCell className='py-1 text-xs'>
                              <span
                                className={
                                  isOverdue ? 'text-red-600 font-medium' : ''
                                }
                              >
                                {formatDate(item.dueDate)}
                              </span>
                            </TableCell>

                            <TableCell className='py-1 text-xs text-center'>
                              {(() => {
                                if (item.daysOverdue > 0) {
                                  return (
                                    <span className='inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600 border border-red-600'>
                                      {item.daysOverdue} zile
                                    </span>
                                  )
                                }
                                return (
                                  <span className='text-muted-foreground text-[10px]'>
                                    În termen
                                  </span>
                                )
                              })()}
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
                            {/* --- Butoanele directe "Detalii", "Încasare", "Compensează" sau Mesaj Aprobare --- */}
                            {isAdmin && (
                              <TableCell className='py-1'>
                                <div className='flex items-center gap-2'>
                                  <Button
                                    variant='outline'
                                    className='h-7 text-xs px-2 cursor-pointer'
                                    onClick={() =>
                                      setSelectedInvoiceId(item._id)
                                    }
                                  >
                                    Detalii
                                  </Button>

                                  {/* Verificăm dacă factura are un status finalizat care permite plăți/compensări */}
                                  {['APPROVED', 'PARTIAL_PAID'].includes(
                                    item.status,
                                  ) ? (
                                    <>
                                      {item.remainingAmount > 0 && (
                                        <Button
                                          variant='outline'
                                          className='h-7 text-xs px-2 cursor-pointer '
                                          onClick={() =>
                                            setPaymentModalData({
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
                                          disabled={processingId === item._id}
                                          className='h-7 text-xs px-2 cursor-pointer text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50'
                                          onClick={() =>
                                            handleCompensate(item._id)
                                          }
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
                                      onClick={() => handleApprove(item._id)}
                                    >
                                      {isPending ? (
                                        <Loader2 className='h-3 w-3 mr-1 animate-spin' />
                                      ) : null}
                                      Aprobă Factura
                                    </Button>
                                  ) : (
                                    <span
                                      className='text-[10px] text-muted-foreground font-medium italic'
                                      title='Așteaptă aprobarea unui administrator'
                                    >
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
                                // CAZUL 1: Este facturat la zi (Fără penalitate nouă azi, dar are zile trecute facturate)
                                if (
                                  item.type === 'INVOICE' &&
                                  (!item.penaltyAmount ||
                                    item.penaltyAmount <= 0) &&
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

                                // CAZUL 2: Nu e nimic de afișat
                                if (
                                  !item.penaltyAmount ||
                                  item.penaltyAmount <= 0 ||
                                  !item.nextBillingDate
                                ) {
                                  return ''
                                }

                                // CAZUL 3: Afișăm când urmează următoarea factură
                                const nextDate = new Date(item.nextBillingDate)
                                const now = new Date()

                                if (nextDate <= now) {
                                  const romaniaTime = toZonedTime(now, TIMEZONE)
                                  const currentHour = romaniaTime.getHours()

                                  // Verificăm dacă mai rulează AZI (trebuie să fie zi lucrătoare ȘI înainte de ora 18:00)
                                  const runsToday =
                                    isBusinessDay(now) && currentHour < 18

                                  if (runsToday) {
                                    return (
                                      <span className='font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap'>
                                        Azi, ora 18:00
                                      </span>
                                    )
                                  }

                                  // Dacă nu rulează azi, calculăm următoarea zi în care va rula
                                  const nextRunDate = getNextBusinessDay(
                                    addDays(now, 1),
                                  )
                                  const tomorrow = startOfDay(addDays(now, 1))

                                  // Dacă prima zi lucrătoare disponibilă pică fix mâine:
                                  if (
                                    startOfDay(nextRunDate).getTime() ===
                                    tomorrow.getTime()
                                  ) {
                                    return (
                                      <span className='font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap'>
                                        Mâine, ora 18:00
                                      </span>
                                    )
                                  }

                                  // Dacă pică altcândva (ex: Luni după un weekend)
                                  const dayNames = [
                                    'Duminică',
                                    'Luni',
                                    'Marți',
                                    'Miercuri',
                                    'Joi',
                                    'Vineri',
                                    'Sâmbătă',
                                  ]
                                  const dayName = dayNames[nextRunDate.getDay()]

                                  return (
                                    <span className='font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap'>
                                      {dayName}, ora 18:00
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
      <Sheet
        open={!!paymentModalData}
        onOpenChange={(open) => !open && setPaymentModalData(null)}
      >
        <SheetContent
          side='right'
          className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[60%] overflow-y-auto'
        >
          <SheetHeader>
            <SheetTitle>Înregistrare Încasare</SheetTitle>
            <SheetDescription>
              Adaugă o încasare pentru factura selectată.
            </SheetDescription>
          </SheetHeader>
          <div className='p-5'>
            {paymentModalData && (
              <CreateClientPaymentForm
                onFormSubmit={() => {
                  setPaymentModalData(null)
                  setTimeout(() => {
                    startTransition(() => {
                      router.refresh()
                    })
                  }, 300)
                }}
                initialClientId={paymentModalData.clientId}
                initialClientName={paymentModalData.clientName}
                initialAmount={paymentModalData.amount}
                initialNotes={paymentModalData.notes}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AllocationModal
        payment={allocationModalPayment}
        onClose={() => {
          setAllocationModalPayment(null)
          setTimeout(() => router.refresh(), 300)
        }}
        isAdmin={isAdmin}
      />
      {penaltyModalData && (
        <PenaltyBillingModal
          isOpen={!!penaltyModalData}
          onClose={() => setPenaltyModalData(null)}
          clientId={penaltyModalData.clientId}
          clientName={penaltyModalData.clientName}
          items={penaltyModalData.items}
          currentUser={currentUser}
        />
      )}
    </>
  )
}
