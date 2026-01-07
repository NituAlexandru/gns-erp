'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import {
  Check,
  ChevronLeft,
  FilePenLine,
  Loader2,
  Printer,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  approveInvoice,
  rejectInvoice,
} from '@/lib/db/modules/financial/invoices/invoice.actions'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { INVOICE_STATUS_MAP } from '@/lib/db/modules/financial/invoices/invoice.constants'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { getPrintData } from '@/lib/db/modules/printing/printing.actions'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface InvoiceDetailsActionsProps {
  invoice: PopulatedInvoice
  isAdmin: boolean
}

export function InvoiceDetailsActions({
  invoice,
  isAdmin,
}: InvoiceDetailsActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  const statusInfo =
    INVOICE_STATUS_MAP[invoice.status] || INVOICE_STATUS_MAP.CREATED

  // Handlerele (le-am copiat din InvoicesList)
  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveInvoice(invoice._id.toString())
      if (result.success) {
        toast.success(result.message)
        router.refresh() // Reîmprospătează pagina
      } else {
        toast.error('Eroare la aprobare', { description: result.message })
      }
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectInvoice(
        invoice._id.toString(),
        rejectionReason
      )
      if (result.success) {
        toast.success(result.message)
        setIsRejectModalOpen(false)
        setRejectionReason('')
        router.refresh() // Reîmprospătează pagina
      } else {
        toast.error('Eroare la respingere', { description: result.message })
      }
    })
  }

  // Handler pentru "Printează" (Deschide Modal)
  const handlePrintPreview = async () => {
    setIsGeneratingPdf(true)
    try {
      const result = await getPrintData(invoice._id.toString(), 'INVOICE')

      if (result.success) {
        setPrintData(result.data)
        setIsPreviewOpen(true)
      } else {
        // Aici suntem pe ramura success: false, deci avem message
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor de printare.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const canApprove =
    isAdmin && (invoice.status === 'CREATED' || invoice.status === 'REJECTED')
  const canReject = isAdmin && invoice.status === 'CREATED'
  const canEdit = invoice.status === 'CREATED' || invoice.status === 'REJECTED'

  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        {/* Partea stângă: Navigare și Titlu */}
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => router.push('/financial/invoices')}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <div className='flex gap-2'>
            <h1 className='text-2xl font-bold tracking-tight'>
              Factura seria {invoice.seriesName} nr. {invoice.invoiceNumber} /{' '}
              {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
            </h1>
            <Badge variant={statusInfo.variant}>{statusInfo.name}</Badge>
          </div>
        </div>

        {/* Partea dreaptă: Acțiuni */}
        <div className='flex flex-wrap items-center gap-2'>
          {/* Buton de Print */}
          <Button
            variant='outline'
            onClick={handlePrintPreview}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Printer className='h-4 w-4 mr-2' />
            )}
            Printează
          </Button>

          {/* Buton de Modifică */}
          <Button
            variant='default'
            disabled={!canEdit}
            onClick={() =>
              router.push(`/financial/invoices/${invoice._id.toString()}/edit`)
            }
          >
            <FilePenLine className='h-4 w-4 mr-2' />
            Modifică
          </Button>

          {/* Buton de Respinge (așa cum ai cerut) */}
          {isAdmin && (
            <AlertDialog
              open={isRejectModalOpen}
              onOpenChange={setIsRejectModalOpen}
            >
              <Button
                variant='destructive'
                disabled={!canReject || isPending}
                onClick={() => setIsRejectModalOpen(true)}
              >
                <X className='h-4 w-4 mr-2' />
                Respinge
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Respinge Factura</AlertDialogTitle>
                  <AlertDialogDescription>
                    Introdu motivul respingerii. Factura va fi mutată în
                    statusul -Respinsă- și va putea fi modificată.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  placeholder='Motivul respingerii (obligatoriu)...'
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Renunță</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReject}
                    disabled={isPending || rejectionReason.length < 3}
                  >
                    {isPending ? 'Se respinge...' : 'Confirmă Respingerea'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Buton de Aprobă (așa cum ai cerut) */}
          {isAdmin && (
            <Button disabled={!canApprove || isPending} onClick={handleApprove}>
              <Check className='h-4 w-4 mr-2' />
              {isPending ? 'Se aprobă...' : 'Aprobă'}
            </Button>
          )}
        </div>
      </div>
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </>
  )
}
