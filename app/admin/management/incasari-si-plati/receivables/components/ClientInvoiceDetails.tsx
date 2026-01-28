'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/invoices/invoice.constants'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getInvoiceWithAllocations } from '@/lib/db/modules/financial/treasury/receivables/client-payment.actions'
import { InvoiceInfoCards } from '@/app/(root)/financial/invoices/components/details/InvoiceInfoCards'
import { InvoiceSummary } from '@/app/(root)/financial/invoices/components/details/InvoiceSummary'
import { InvoiceItemsTable } from '@/app/(root)/financial/invoices/components/details/InvoiceItemsTable'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { getPrintData } from '@/lib/db/modules/printing/printing.actions'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import { PAYMENT_METHOD_MAP } from '@/lib/db/modules/financial/treasury/payment.constants'

interface ClientInvoiceDetailsProps {
  invoiceId: string
  onClose?: () => void
  currentUserRole?: string
}

export function ClientInvoiceDetails({
  invoiceId,
  currentUserRole = 'admin', // Default admin dacă nu se specifică
}: ClientInvoiceDetailsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ invoice: any; allocations: any[] } | null>(
    null,
  )
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const result = await getInvoiceWithAllocations(invoiceId)

      if (result.success && result.data) {
        setData(result.data)
      } else {
        toast.error(result.message || 'Eroare la încărcare.')
      }
      setLoading(false)
    }

    if (invoiceId) fetchData()
  }, [invoiceId])

  if (loading) {
    return (
      <div className='flex h-full flex-col items-center justify-center space-y-4'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <p className='text-sm text-muted-foreground'>Se încarcă factura...</p>
      </div>
    )
  }

  if (!data) return <div className='p-8 text-center'>Nu s-au găsit date.</div>

  const { invoice, allocations } = data
  const statusInfo = INVOICE_STATUS_MAP[
    invoice.status as keyof typeof INVOICE_STATUS_MAP
  ] || { name: invoice.status, variant: 'secondary' }

  const handlePrintPreview = async () => {
    setIsGeneratingPdf(true)
    try {
      const result = await getPrintData(invoiceId, 'INVOICE')

      if (result.success) {
        setPrintData(result.data)
        setIsPreviewOpen(true)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor de printare.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className='flex flex-col h-full overflow-hidden bg-background text-foreground'>
      {/* HEADER */}
      <div className='flex items-center justify-between border-b px-6 py-4 pr-15 bg-muted/10 shrink-0'>
        <div>
          <h2 className='text-lg font-semibold flex items-center gap-2'>
            Detalii Factură: {invoice.seriesName} - {invoice.invoiceNumber}
            <Badge variant='outline' className='ml-2'>
              {invoice.invoiceType}
            </Badge>
            <Badge variant={statusInfo.variant as any} className='ml-2'>
              {statusInfo.name}
            </Badge>
          </h2>
          <p className='text-sm text-muted-foreground'>
            ID: <span className='font-mono text-xs'>{invoiceId}</span>
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {/* Buton Print Funcțional */}
          <Button
            variant='outline'
            size='sm'
            onClick={handlePrintPreview}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Printer className='mr-2 h-4 w-4' />
            )}
            Printeaza
          </Button>
        </div>
      </div>

      <ScrollArea className='flex-1 h-full'>
        <div className='p-6 space-y-8 pb-40'>
          {/* 1. GRID PRINCIPAL (Copiat structura din pagina de Facturi) */}
          <div className='grid grid-cols-1 2xl:grid-cols-3 gap-4'>
            {/* COLOANA STÂNGA (2/3) - Info Cards */}
            <div className='xl:col-span-2 space-y-4'>
              <InvoiceInfoCards invoice={invoice} />
            </div>

            {/* COLOANA DREAPTA (1/3) - Summary + Note */}
            <div className='2xl:col-span-1 space-y-4'>
              <InvoiceSummary invoice={invoice} isAdmin={true} />
            </div>

            {/* COLOANA JOS (Full Width) - Produse */}
            <div className='xl:col-span-3'>
              <InvoiceItemsTable
                items={invoice.items}
                currentUserRole={currentUserRole}
              />
            </div>
          </div>

          <Separator className='my-6' />

          {/* 2. SECȚIUNEA SPECIALĂ PENTRU ÎNCASĂRI (Care nu există în pagina standard) */}
          <div>
            <h3 className='text-base font-bold mb-3'>
              Istoric Plăți / Alocări
            </h3>
            {allocations.length === 0 ? (
              <div className='border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground bg-muted/10'>
                Nu există plăți înregistrate pentru această factură.
              </div>
            ) : (
              <div className='rounded-md border overflow-hidden'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/50 text-muted-foreground font-medium text-xs uppercase'>
                    <tr>
                      <th className='px-4 py-3 text-left'>Document Plată</th>
                      <th className='px-4 py-3 text-left'>Data</th>
                      <th className='px-4 py-3 text-left'>Metodă</th>
                      <th className='px-4 py-3 text-right'>Sumă Alocată</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y bg-card'>
                    {allocations.map((alloc: any) => {
                      // 1. Popularea
                      const payment = alloc.paymentId || {}
                      const paymentDate = payment.paymentDate
                        ? new Date(payment.paymentDate)
                        : null

                      // 2. Mapare Metodă (să arate frumos)
                      const methodKey =
                        payment.paymentMethod as keyof typeof PAYMENT_METHOD_MAP
                      const methodName =
                        PAYMENT_METHOD_MAP[methodKey]?.name ||
                        payment.paymentMethod ||
                        'N/A'

                      // 3. SUMA CORECTĂ (Conform modelului tău: amountAllocated)
                      const amount = Number(alloc.amountAllocated || 0)

                      return (
                        <tr key={alloc._id} className='hover:bg-muted/20'>
                          <td className='px-4 py-1 font-medium'>
                            {payment.seriesName
                              ? `${payment.seriesName} - `
                              : ''}
                            {payment.paymentNumber || 'Fără Număr'}
                          </td>
                          <td className='px-4 py-1 text-muted-foreground'>
                            {paymentDate
                              ? formatDateTime(paymentDate).dateOnly
                              : '-'}
                          </td>
                          <td className='px-4 py-1'>
                            <Badge variant='outline' className='text-xs'>
                              {methodName}
                            </Badge>
                          </td>
                          <td className='px-4 py-1 text-right font-bold text-green-600'>
                            {formatCurrency(amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </div>
  )
}
