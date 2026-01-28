'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClientInvoicesTable } from './ClientInvoicesTable'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { CreateClientPaymentForm } from './CreateClientPaymentForm'
import { ClientInvoiceDetails } from './ClientInvoiceDetails'

interface ClientInvoicesWrapperProps {
  initialData: any
}

export function ClientInvoicesWrapper({
  initialData,
}: ClientInvoicesWrapperProps) {
  const router = useRouter()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
    undefined,
  )
  const [selectedClientName, setSelectedClientName] = useState<
    string | undefined
  >(undefined)

  const [prefilledAmount, setPrefilledAmount] = useState<number | undefined>(
    undefined,
  )
  const [prefilledNotes, setPrefilledNotes] = useState<string | undefined>(
    undefined,
  )

  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null)

  const handleViewInvoice = (invoiceId: string) => {
    setPreviewInvoiceId(invoiceId)
  }

  const handleOpenPayment = (
    clientId: string,
    clientName: string,
    invoiceId?: string,
  ) => {
    setSelectedClientId(clientId)
    setSelectedClientName(clientName)

    if (invoiceId) {
      const invoice = initialData.data.find((inv: any) => inv._id === invoiceId)
      if (invoice) {
        setPrefilledAmount(invoice.remainingAmount)
        setPrefilledNotes(
          `Plată factură ${invoice.seriesName}-${invoice.invoiceNumber}`,
        )
      }
    } else {
      setPrefilledAmount(undefined)
      setPrefilledNotes(undefined)
    }

    setPaymentModalOpen(true)
  }

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false)
    setSelectedClientId(undefined)
    setSelectedClientName(undefined)
    setPrefilledAmount(undefined)
    setPrefilledNotes(undefined)
    router.refresh()
  }

  return (
    <>
      <ClientInvoicesTable
        data={initialData}
        onOpenCreatePayment={handleOpenPayment}
        onViewInvoice={handleViewInvoice}
      />

      {/* 1. MODAL ÎNCASARE (Create Payment) */}
      <Sheet open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <SheetContent
          side='right'
          className='w-[90%] max-w-none sm:w-[90%] md:w-[80%] lg:w-[60%] overflow-y-auto'
        >
          <SheetHeader>
            <SheetTitle>Înregistrare Încasare</SheetTitle>
            <SheetDescription>Încasează factura selectată.</SheetDescription>
          </SheetHeader>
          <div className='p-5'>
            <CreateClientPaymentForm
              onFormSubmit={handlePaymentSuccess}
              initialClientId={selectedClientId}
              initialClientName={selectedClientName}
              initialAmount={prefilledAmount}
              initialNotes={prefilledNotes}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 2. MODAL PREVIZUALIZARE FACTURĂ */}
      <Sheet
        open={!!previewInvoiceId}
        onOpenChange={(open) => !open && setPreviewInvoiceId(null)}
      >
        <SheetHeader className='hidden'>
          <SheetTitle>Detalii Factură</SheetTitle>
          <SheetDescription>
            Vizualizare detaliată a facturii și plăților.
          </SheetDescription>
        </SheetHeader>
        <SheetContent
          side='right'
          className='h-screen flex flex-col overflow-hidden w-[95%] max-w-none sm:w-[95%] md:w-[90%] lg:w-[85%] xl:w-[75%] p-0 gap-0'
        >
          {previewInvoiceId && (
            <ClientInvoiceDetails
              invoiceId={previewInvoiceId}
              onClose={() => setPreviewInvoiceId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
