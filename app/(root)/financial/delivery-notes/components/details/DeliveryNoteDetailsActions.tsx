'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import {
  Check,
  ChevronLeft,
  DollarSign,
  Download,
  Printer,
  X,
  Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { DeliveryNoteStatusBadge } from '../DeliveryNoteStatusBadge'
import { createInvoiceFromSingleNote } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { InvoiceActionResult } from '@/lib/db/modules/financial/invoices/invoice.types'
import { ConfirmDeliveryModal } from '@/components/shared/modals/ConfirmDeliveryModal'
import { SelectSeriesModal } from '@/components/shared/modals/SelectSeriesModal'
import { DocumentType } from '@/lib/db/modules/numbering/documentCounter.model'
import {
  confirmDeliveryNote,
  cancelDeliveryNote,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
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
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface DeliveryNoteDetailsActionsProps {
  note: DeliveryNoteDTO
  currentUserId: string
  currentUserName: string
}

export function DeliveryNoteDetailsActions({
  note,
  currentUserId,
  currentUserName,
}: DeliveryNoteDetailsActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Modale state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  // HANDLERS
  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmDeliveryNote({
        deliveryNoteId: note._id,
        userId: currentUserId,
        userName: currentUserName,
      })
      if (result.success) {
        toast.success(result.message)
        setShowConfirmModal(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelDeliveryNote({
        deliveryNoteId: note._id,
        reason: cancelReason,
        userId: currentUserId,
        userName: currentUserName,
      })
      if (result.success) {
        toast.success(result.message)
        setShowCancelModal(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleGenerateInvoice = async (series?: string) => {
    startTransition(async () => {
      const result: InvoiceActionResult = await createInvoiceFromSingleNote(
        note.deliveryId,
        series
      )
      if (result.success) {
        toast.success('Factura generată cu succes!')
        setShowInvoiceModal(false)
        router.refresh()
      } else if ('requireSelection' in result && result.requireSelection) {
        setShowInvoiceModal(true)
      } else {
        toast.error(result.message)
      }
    })
  }

  const handlePrintPreview = async () => {
    setIsGeneratingPdf(true)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(note._id.toString(), 'DELIVERY_NOTE')

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
    <>
      <div className='flex flex-wrap items-center justify-between gap-2 mb-4'>
        {/* Navigare & Titlu */}
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => router.push('/financial/delivery-notes')}
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <div className='flex gap-2 items-center'>
            <h1 className='text-2xl font-bold tracking-tight'>
              Aviz seria {note.seriesName} nr. {note.noteNumber} din data de{' '}
              {note.deliveryDate
                ? new Date(note.deliveryDate).toLocaleDateString('ro-RO')
                : new Date(note.createdAt).toLocaleDateString('ro-RO')}
            </h1>
            <DeliveryNoteStatusBadge status={note.status} />
          </div>
        </div>

        {/* Butoane Acțiuni */}
        <div className='flex flex-wrap items-center gap-2'>
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

          {/* Confirmare - Doar IN_TRANSIT */}
          {note.status === 'IN_TRANSIT' && (
            <Button
              className='bg-green-600 hover:bg-green-700 text-white'
              onClick={() => setShowConfirmModal(true)}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Check className='h-4 w-4 mr-2' />
              )}
              Confirmă Livrarea
            </Button>
          )}

          {/* Facturare - Doar DELIVERED si nefacturat */}
          {note.status === 'DELIVERED' && !note.isInvoiced && (
            <Button
              variant='default'
              onClick={() => handleGenerateInvoice()}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <DollarSign className='h-4 w-4 mr-2' />
              )}
              Generează Factură
            </Button>
          )}

          {/* Anulare - Doar IN_TRANSIT */}
          {note.status === 'IN_TRANSIT' && (
            <Button
              variant='destructive'
              onClick={() => setShowCancelModal(true)}
              disabled={isPending}
            >
              <X className='h-4 w-4 mr-2' />
              Anulează
            </Button>
          )}
        </div>
      </div>

      {/* MODALE */}
      {showConfirmModal && (
        <ConfirmDeliveryModal
          isLoading={isPending}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleConfirm}
        />
      )}
      {showInvoiceModal && (
        <SelectSeriesModal
          documentType={'Factura' as unknown as DocumentType}
          onCancel={() => setShowInvoiceModal(false)}
          onSelect={(series) => handleGenerateInvoice(series)}
        />
      )}
      <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare Aviz</AlertDialogTitle>
            <AlertDialogDescription>
              Introdu motivul anulării. Livrarea va reveni la statusul
              "Programat".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-2'>
            <Input
              placeholder='Motiv anulare...'
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason('')}>
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelReason.length < 5 || isPending}
              className='bg-destructive hover:bg-destructive/90'
            >
              Confirmă Anularea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </>
  )
}
