'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye,
  ExternalLink,
  Package,
  ScrollText,
  Printer,
  FilePenLine,
  Check,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

// Importuri tipuri și acțiuni
import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import {
  approveInvoice,
  rejectInvoice,
} from '@/lib/db/modules/financial/invoices/invoice.actions'
import { getPrintData } from '@/lib/db/modules/printing/printing.actions'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import { InvoiceStatusBadge } from '../InvoiceStatusBadge'
import { InvoiceInfoCards } from './InvoiceInfoCards'
import { InvoiceSummary } from './InvoiceSummary'
import { InvoiceItemsTable } from './InvoiceItemsTable'

interface InvoicePreviewProps {
  invoice: PopulatedInvoice
  isAdmin: boolean
  currentUserRole?: string
}

export function InvoicePreview({
  invoice,
  isAdmin,
  currentUserRole = 'user',
}: InvoicePreviewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State pentru acțiuni (copiate din DetailsActions)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isAvizeDropdownOpen, setIsAvizeDropdownOpen] = useState(false)
  const [isOrdersDropdownOpen, setIsOrdersDropdownOpen] = useState(false)
  // Drepturi
  const canApprove =
    isAdmin && (invoice.status === 'CREATED' || invoice.status === 'REJECTED')
  const canReject = isAdmin && invoice.status === 'CREATED'
  const canEdit = invoice.status === 'CREATED' || invoice.status === 'REJECTED'

  // --- HANDLERS ---

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
        setIsPdfPreviewOpen(true)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea PDF.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Stil comun butoane header (Compact)
  const btnClass = 'h-7 px-2 text-xs gap-1.5'

  return (
    <>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 hover:bg-muted'
          >
            <Eye className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors' />
            <span className='sr-only'>Previzualizare Factură</span>
          </Button>
        </HoverCardTrigger>

        <HoverCardContent
          side='left'
          align='start'
          sideOffset={10}
          collisionPadding={50}
          className='w-[1200px] p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-slate-800'
        >
          <div className='max-h-[90vh] overflow-y-auto bg-card dark:bg-card/95'>
            <div className='p-6 space-y-6'>
              {/* --- 1. HEADER CU BUTOANE --- */}
              <div className='flex justify-between items-start'>
                <div>
                  <h1 className='text-xl font-bold flex items-center gap-2'>
                    Factura {invoice.seriesName} - {invoice.invoiceNumber}
                  </h1>
                  <p className='text-sm text-muted-foreground'>
                    Data:{' '}
                    {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
                  </p>
                </div>

                <div className='flex items-center gap-2 flex-wrap justify-end'>
                  <InvoiceStatusBadge status={invoice.status} />
                  <div className='h-6 w-px bg-border mx-1' />

                  {/* NAVIGARE: Comenzi (Logică Multiplă + Număr Real) */}
                  {invoice.relatedOrders &&
                    invoice.relatedOrders.length > 0 &&
                    (invoice.relatedOrders.length === 1 ? (
                      // CAZ 1: O singură comandă -> Buton Direct
                      <Button
                        variant='outline'
                        size='sm'
                        className={btnClass}
                        asChild
                        title='Vezi Comanda'
                      >
                        <Link
                          href={`/orders/${invoice.relatedOrders[0].toString()}`}
                        >
                          <Package className='h-3.5 w-3.5 text-muted-foreground' />
                          {/* Afișăm numărul real din snapshot */}
                          <span>
                            Comanda{' '}
                            {invoice.logisticSnapshots?.orderNumbers?.[0] || ''}
                          </span>
                        </Link>
                      </Button>
                    ) : (
                      // CAZ 2: Multiple comenzi -> Custom Dropdown
                      <div className='relative inline-block'>
                        <Button
                          variant='outline'
                          size='sm'
                          className={btnClass}
                          onClick={() =>
                            setIsOrdersDropdownOpen(!isOrdersDropdownOpen)
                          }
                        >
                          <Package className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>{invoice.relatedOrders.length} Comenzi</span>
                          <ChevronDown
                            className={`h-3 w-3 opacity-50 ml-1 transition-transform ${isOrdersDropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </Button>

                        {/* Lista Dropdown Manuală */}
                        {isOrdersDropdownOpen && (
                          <div className='absolute top-full right-0 mt-1 w-50 bg-secondary border shadow-md rounded-md z-50 flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200'>
                            {invoice.relatedOrders.map((orderId, idx) => {
                              // Extragem numărul real
                              const orderNumber =
                                invoice.logisticSnapshots?.orderNumbers?.[idx]

                              return (
                                <Link
                                  key={orderId.toString()}
                                  href={`/orders/${orderId.toString()}`}
                                  className='flex items-center px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-primary transition-colors'
                                >
                                  <Package className='h-3 w-3 mr-2 text-muted-foreground' />
                                  <span className='font-medium'>
                                    {orderNumber
                                      ? `Comanda ${orderNumber}`
                                      : `Comanda #${idx + 1}`}
                                  </span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* NAVIGARE: Avize (Custom Dropdown) */}
                  {invoice.sourceDeliveryNotes &&
                    invoice.sourceDeliveryNotes.length > 0 &&
                    (invoice.sourceDeliveryNotes.length === 1 ? (
                      // CAZ 1: Un singur aviz -> Buton Direct cu Număr
                      <Button
                        variant='outline'
                        size='sm'
                        className={btnClass}
                        asChild
                        title='Vezi Aviz'
                      >
                        <Link
                          href={`/financial/delivery-notes/${invoice.sourceDeliveryNotes[0].toString()}`}
                        >
                          <ScrollText className='h-3.5 w-3.5 text-muted-foreground' />
                          {/* Afișăm numărul real dacă există în snapshot */}
                          <span>
                            Aviz{' '}
                            {invoice.logisticSnapshots
                              ?.deliveryNoteNumbers?.[0] || ''}
                          </span>
                        </Link>
                      </Button>
                    ) : (
                      // CAZ 2: Multiple avize -> Custom Dropdown
                      <div className='relative inline-block'>
                        <Button
                          variant='outline'
                          size='sm'
                          className={btnClass}
                          onClick={() =>
                            setIsAvizeDropdownOpen(!isAvizeDropdownOpen)
                          }
                        >
                          <ScrollText className='h-3.5 w-3.5 text-muted-foreground' />
                          <span>
                            {invoice.sourceDeliveryNotes.length} Avize
                          </span>
                          <ChevronDown
                            className={`h-3 w-3 opacity-50 ml-1 transition-transform ${isAvizeDropdownOpen ? 'rotate-180' : ''}`}
                          />
                        </Button>

                        {/* Lista Dropdown Manuală */}
                        {isAvizeDropdownOpen && (
                          <div className='absolute top-full right-0 mt-1 w-30 bg-secondary border shadow-md rounded-md z-50 flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200'>
                            {invoice.sourceDeliveryNotes.map((noteId, idx) => {
                              const noteNumber =
                                invoice.logisticSnapshots
                                  ?.deliveryNoteNumbers?.[idx]

                              return (
                                <Link
                                  key={noteId.toString()}
                                  href={`/financial/delivery-notes/${noteId.toString()}`}
                                  className='flex items-center px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-primary transition-colors'
                                >
                                  <ScrollText className='h-3 w-3 mr-2 text-muted-foreground' />
                                  <span className='font-medium'>
                                    {noteNumber || `Aviz #${idx + 1}`}
                                  </span>
                                </Link>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Link Detalii Pagină */}
                  <Button
                    variant='outline'
                    size='sm'
                    className={`${btnClass} `}
                    asChild
                  >
                    <Link href={`/financial/invoices/${invoice._id}`}>
                      <ExternalLink className='h-3.5 w-3.5' />
                      <span>Detalii</span>
                    </Link>
                  </Button>

                  <div className='h-6 w-px bg-border mx-1' />

                  {/* ACȚIUNI: Print */}
                  <Button
                    variant='outline'
                    size='sm'
                    className={btnClass}
                    onClick={handlePrintPreview}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    ) : (
                      <Printer className='h-3.5 w-3.5' />
                    )}
                    <span>Print</span>
                  </Button>

                  {/* ACȚIUNI: Edit (Vizibil doar dacă e editabilă) */}
                  {canEdit && (
                    <Button
                      variant='outline'
                      size='sm'
                      className={btnClass}
                      asChild
                    >
                      <Link
                        href={`/financial/invoices/${invoice._id.toString()}/edit`}
                      >
                        <FilePenLine className='h-3.5 w-3.5 mr-1.5' /> Modifica
                      </Link>
                    </Button>
                  )}

                  {/* ACȚIUNI ADMIN: Respinge */}
                  {canReject && (
                    <Button
                      variant='destructive'
                      size='sm'
                      className={btnClass}
                      onClick={() => setIsRejectModalOpen(true)}
                      disabled={isPending}
                    >
                      <X className='h-3.5 w-3.5' />
                      <span>Respinge</span>
                    </Button>
                  )}

                  {/* ACȚIUNI ADMIN: Aprobă */}
                  {canApprove && (
                    <Button
                      variant='default' // Sau className cu bg-green-600 pentru consistență
                      size='sm'
                      className={`${btnClass} bg-green-600 hover:bg-green-700 text-white`}
                      onClick={handleApprove}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                      ) : (
                        <Check className='h-3.5 w-3.5' />
                      )}
                      <span>Aprobă</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* 2. REUTILIZARE COMPONENTE DETALII */}
              <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
                <div className='xl:col-span-2 space-y-2'>
                  <InvoiceInfoCards invoice={invoice} isPreview={true} />
                </div>
                <div className='xl:col-span-1'>
                  <InvoiceSummary
                    invoice={invoice}
                    isAdmin={isAdmin}
                    isPreview={true}
                  />
                </div>
                <div className='xl:col-span-3'>
                  <InvoiceItemsTable
                    items={invoice.items}
                    currentUserRole={currentUserRole}
                    isPreview={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* --- MODALE (Plasate în afara HoverCard-ului, dar în fragment) --- */}

      {/* Modal Respingere */}
      <AlertDialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Respinge Factura</AlertDialogTitle>
            <AlertDialogDescription>
              Introdu motivul respingerii. Factura va fi mutată în statusul
              "Respinsă" și va putea fi modificată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-2'>
            <Input
              placeholder='Motivul respingerii (obligatoriu)...'
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason('')}>
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending || rejectionReason.length < 3}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              Confirmă Respingerea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Print */}
      <PdfPreviewModal
        isOpen={isPdfPreviewOpen}
        onClose={() => setIsPdfPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </>
  )
}
