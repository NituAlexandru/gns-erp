'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  ChevronLeft,
  ChevronDown,
  FilePenLine,
  Loader2,
  Package,
  Printer,
  ScrollText,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import {
  approveInvoice,
  rejectInvoice,
} from '@/lib/db/modules/financial/invoices/invoice.actions'
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

  // Stil comun identic cu cel din Preview
  const btnClass = 'h-7 px-2 text-xs gap-1.5'

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveInvoice(invoice._id.toString())
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare la aprobare', { description: result.message })
      }
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectInvoice(
        invoice._id.toString(),
        rejectionReason,
      )
      if (result.success) {
        toast.success(result.message)
        setIsRejectModalOpen(false)
        setRejectionReason('')
        router.refresh()
      } else {
        toast.error('Eroare la respingere', { description: result.message })
      }
    })
  }

  const handlePrintPreview = async () => {
    setIsGeneratingPdf(true)
    try {
      const result = await getPrintData(invoice._id.toString(), 'INVOICE')

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

  const canApprove =
    isAdmin && (invoice.status === 'CREATED' || invoice.status === 'REJECTED')
  const canReject = isAdmin && invoice.status === 'CREATED'
  const canEdit = invoice.status === 'CREATED' || invoice.status === 'REJECTED'

  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        {/* Partea stângă: Navigare și Titlu */}
        <div className='flex items-center gap-2'>
          <Button variant='outline' size='icon' onClick={() => router.back()}>
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
          {/* --- NAVIGARE: COMENZI (Design Identic Preview) --- */}
          {invoice.relatedOrders &&
            invoice.relatedOrders.length > 0 &&
            (invoice.relatedOrders.length === 1 ? (
              // CAZ 1: O singură comandă -> Link Direct
              <Button variant='outline' size='sm' className={btnClass} asChild>
                <Link href={`/orders/${invoice.relatedOrders[0].toString()}`}>
                  <Package className='h-3.5 w-3.5 text-muted-foreground' />
                  <span>
                    Comanda {invoice.logisticSnapshots?.orderNumbers?.[0] || ''}
                  </span>
                </Link>
              </Button>
            ) : (
              // CAZ 2: Multiple comenzi -> Dropdown Shadcn
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className={btnClass}>
                    <Package className='h-3.5 w-3.5 text-muted-foreground' />
                    <span>{invoice.relatedOrders.length} Comenzi</span>
                    <ChevronDown className='h-3 w-3 opacity-50 ml-1' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  {invoice.relatedOrders.map((orderId, idx) => {
                    const orderNumber =
                      invoice.logisticSnapshots?.orderNumbers?.[idx]
                    return (
                      <DropdownMenuItem
                        key={orderId.toString()}
                        asChild
                        className='cursor-pointer hover:text-primary'
                      >
                        <Link href={`/orders/${orderId.toString()}`}>
                          <Package className='h-3 w-3 mr-2 text-muted-foreground' />
                          <span>
                            {orderNumber
                              ? `Comanda ${orderNumber}`
                              : `Comanda #${idx + 1}`}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

          {/* --- NAVIGARE: AVIZE (Design Identic Preview) --- */}
          {invoice.sourceDeliveryNotes &&
            invoice.sourceDeliveryNotes.length > 0 &&
            (invoice.sourceDeliveryNotes.length === 1 ? (
              // CAZ 1: Un singur aviz -> Link Direct
              <Button variant='outline' size='sm' className={btnClass} asChild>
                <Link
                  href={`/financial/delivery-notes/${invoice.sourceDeliveryNotes[0].toString()}`}
                >
                  <ScrollText className='h-3.5 w-3.5 text-muted-foreground' />
                  <span>
                    Aviz{' '}
                    {invoice.logisticSnapshots?.deliveryNoteNumbers?.[0] || ''}
                  </span>
                </Link>
              </Button>
            ) : (
              // CAZ 2: Multiple avize -> Dropdown Shadcn
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className={btnClass}>
                    <ScrollText className='h-3.5 w-3.5 text-muted-foreground' />
                    <span>{invoice.sourceDeliveryNotes.length} Avize</span>
                    <ChevronDown className='h-3 w-3 opacity-50 ml-1' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  {invoice.sourceDeliveryNotes.map((noteId, idx) => {
                    const noteNumber =
                      invoice.logisticSnapshots?.deliveryNoteNumbers?.[idx]
                    return (
                      <DropdownMenuItem
                        key={noteId.toString()}
                        asChild
                        className='cursor-pointer hover:text-primary'
                      >
                        <Link
                          href={`/financial/delivery-notes/${noteId.toString()}`}
                        >
                          <ScrollText className='h-3 w-3 mr-2 text-muted-foreground' />
                          <span>{noteNumber || `Aviz #${idx + 1}`}</span>
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}

          {/* Separator vizual (opțional) */}
          {(invoice.relatedOrders?.length > 0 ||
            invoice.sourceDeliveryNotes?.length > 0) && (
            <div className='h-6 w-px bg-border mx-1' />
          )}

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

          {/* Buton de Respinge */}
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

          {/* Buton de Aprobă */}
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
