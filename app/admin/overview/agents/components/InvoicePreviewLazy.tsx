'use client'

import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import { getInvoiceById } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { InvoiceStatusBadge } from '@/app/(root)/financial/invoices/components/InvoiceStatusBadge'
import { InvoiceInfoCards } from '@/app/(root)/financial/invoices/components/details/InvoiceInfoCards'
import { InvoiceSummary } from '@/app/(root)/financial/invoices/components/details/InvoiceSummary'
import { InvoiceItemsTable } from '@/app/(root)/financial/invoices/components/details/InvoiceItemsTable'

export function InvoicePreviewLazy({
  invoiceId,
  isAdmin,
  currentUserRole = 'admin',
}: {
  invoiceId: string
  isAdmin: boolean
  currentUserRole?: string
}) {
  const [invoice, setInvoice] = useState<PopulatedInvoice | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleOpenChange = async (open: boolean) => {
    if (open && !invoice) {
      setIsLoading(true)
      const res = await getInvoiceById(invoiceId)
      if (res.success && res.data) setInvoice(res.data)
      setIsLoading(false)
    }
  }

  return (
    <HoverCard openDelay={200} onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <Button variant='ghost' size='icon' className='h-7 w-7 hover:bg-muted'>
          <Eye className='h-4 w-4 text-muted-foreground hover:text-foreground' />
        </Button>
      </HoverCardTrigger>

      <HoverCardContent
        side='right'
        align='start'
        sideOffset={15}
        collisionPadding={50}
        className='w-[1100px] p-0 shadow-2xl border-slate-800 z-[100]'
      >
        <div className='max-h-[85vh] overflow-y-auto bg-card p-6'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center p-20 gap-3'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <p className='text-sm text-muted-foreground'>
                Se încarcă datele facturii...
              </p>
            </div>
          ) : invoice ? (
            <div className='space-y-6'>
              <div className='flex justify-between items-center'>
                <h1 className='text-xl font-bold'>
                  Factura {invoice.seriesName} - {invoice.invoiceNumber}
                </h1>
                <InvoiceStatusBadge status={invoice.status} />
              </div>
              <div className='grid grid-cols-3 gap-4'>
                <div className='col-span-2'>
                  <InvoiceInfoCards invoice={invoice} isPreview={true} />
                </div>
                <div>
                  <InvoiceSummary
                    invoice={invoice}
                    isAdmin={isAdmin}
                    isPreview={true}
                  />
                </div>
                <div className='col-span-3'>
                  <InvoiceItemsTable
                    items={invoice.items}
                    currentUserRole={currentUserRole}
                    isPreview={true}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className='p-6 text-center text-destructive'>
              Eroare la încărcare.
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
