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
import { ClientBalanceItem } from './ClientBalanceItem'

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
      {isPending && (
        <div className='flex items-center justify-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded-md mb-2 border border-primary/20 animate-pulse'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <span className='font-medium'>
            Se actualizează soldurile și totalurile...
          </span>
        </div>
      )}
      <div className='h-full overflow-y-auto pr-1'>
        <Accordion type='single' collapsible className='w-full space-y-1.5'>
          {data.map((client) => (
            <ClientBalanceItem
              key={client.clientId}
              client={client}
              isAdmin={isAdmin}
              onOpenDetails={setSelectedInvoiceId}
              onOpenPayment={setPaymentModalData}
              onOpenAllocation={setAllocationModalPayment}
              onOpenPenalty={setPenaltyModalData}
              onCompensate={handleCompensate}
              onApprove={handleApprove}
              processingId={processingId}
              isPending={isPending}
            />
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
                  startTransition(() => {
                    router.refresh()
                  })
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
          startTransition(() => {
            router.refresh()
          })
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
