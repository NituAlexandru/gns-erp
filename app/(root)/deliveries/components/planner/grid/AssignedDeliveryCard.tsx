'use client'

import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  FilePenLine,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Printer,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  cancelDeliveryNoteFromPlanner,
  confirmDeliveryFromPlanner,
  createDeliveryNote,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
import { toast } from 'sonner'
import { useState } from 'react'
import { SelectSeriesModal } from '@/components/shared/modals/SelectSeriesModal'
import { CreateDeliveryNoteResult } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import { useRouter } from 'next/navigation'
import { CancelNoteModal } from '@/components/shared/modals/CancelNoteModal'
import { ConfirmDeliveryModal } from '@/components/shared/modals/ConfirmDeliveryModal'
import { createInvoiceFromSingleNote } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { InvoiceActionResult } from '@/lib/db/modules/financial/invoices/invoice.types'
import { DocumentType } from '@/lib/db/modules/numbering/documentCounter.model'
import Link from 'next/link'
import {
  ABLY_API_ENDPOINTS,
  ABLY_CHANNELS,
  ABLY_EVENTS,
} from '@/lib/db/modules/ably/constants'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

type DeliveryCardInfo = {
  delivery: IDelivery
  startSlot: string
  span: number
}

interface AssignedDeliveryCardProps {
  cardInfo: DeliveryCardInfo
  onSchedule: (delivery: IDelivery) => void
}

export function AssignedDeliveryCard({
  cardInfo,
  onSchedule,
}: AssignedDeliveryCardProps) {
  const { delivery } = cardInfo
  const router = useRouter()
  // --- Stări de încărcare ---
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  // --- Stări pentru Modaluri ---
  const [showSeriesModal, setShowSeriesModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  // Generate Invoice
  const [showInvoiceSeriesModal, setShowInvoiceSeriesModal] = useState(false)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  // --- Stări noi pentru previzualizare PDF ---
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  async function handleGenerateDeliveryNote(
    seriesName?: string,
    manualNumber?: string,
  ) {
    setIsGenerating(true)
    const toastId = `generate-${delivery._id}`
    toast.loading('Se generează avizul...', { id: toastId })

    try {
      const result: CreateDeliveryNoteResult = await createDeliveryNote({
        deliveryId: `${delivery._id}`,
        seriesName: seriesName ?? undefined,
        manualNumber: manualNumber ?? undefined,
      })

      if (result.success) {
        toast.success('Avizul a fost generat cu succes!', { id: toastId })
        router.refresh()

        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: ABLY_CHANNELS.PLANNER,
                event: ABLY_EVENTS.DATA_CHANGED,
                data: {
                  message: `Aviz ${result.data.seriesName}-${result.data.noteNumber} generat.`,
                  deliveryId: result.data.deliveryId,
                  newStatus: result.data.status, // IN_TRANSIT
                },
              }),
            },
          )
        } catch (ablyError) {
          console.error('Ably fetch trigger error (createNote):', ablyError)
        }
      } else if ('requireSelection' in result && result.requireSelection) {
        toast.dismiss(toastId)
        setShowSeriesModal(true)
      } else {
        toast.error(result.message || 'Eroare la generarea avizului', {
          id: toastId,
        })
      }
    } catch (err) {
      console.error('❌ Eroare la generare aviz:', err)
      toast.error('Eroare internă la generarea avizului', {
        id: toastId,
      })
    }
    setIsGenerating(false) // Oprește loading
  }

  async function handleConfirmDelivery() {
    if (isConfirming) return // Previne dublu-click

    setIsConfirming(true)
    const toastId = `confirm-${delivery._id}`
    toast.loading('Se confirmă livrarea...', { id: toastId })

    try {
      // Apelează noua funcție "wrapper"
      const result = await confirmDeliveryFromPlanner({
        deliveryId: `${delivery._id}`,
      })

      if (result.success) {
        toast.success('Livrarea a fost confirmată cu succes!', { id: toastId })
        router.refresh() // Actualizează UI-ul

        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: ABLY_CHANNELS.PLANNER,
                event: ABLY_EVENTS.DATA_CHANGED,
                data: {
                  message: `Livrare ${delivery.deliveryNumber} confirmată.`,
                  deliveryId: delivery._id.toString(),
                  newStatus: 'DELIVERED',
                  orderId: delivery.orderId.toString(), // Nu avem noul status al comenzii aici, dar e ok,
                  // 'router.refresh()' va prinde oricum schimbarea
                },
              }),
            },
          )
        } catch (ablyError) {
          console.error('Ably fetch trigger error (confirm):', ablyError)
        }
      } else {
        toast.error(result.message || 'Eroare la confirmarea livrării', {
          id: toastId,
        })
      }
    } catch (err) {
      console.error('❌ Eroare la confirmare livrare:', err)
      toast.error('Eroare internă la confirmarea livrării', {
        id: toastId,
      })
    }
    setIsConfirming(false) // Oprește loading
  }

  const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
    name: 'Necunoscut',
    variant: 'secondary',
  }

  const addressParts = [
    delivery.deliveryAddress.strada,
    delivery.deliveryAddress.numar,
    delivery.deliveryAddress.localitate,
    delivery.deliveryAddress.judet,
  ]
  const formattedAddress = addressParts.filter((part) => part).join(', ')

  const canGenerateNote = !delivery.isNoticed && delivery.status === 'SCHEDULED'
  // Poți confirma dacă AVEM un aviz (isNoticed) și statusul e ÎN TRANZIT
  const canConfirmDelivery =
    delivery.isNoticed && delivery.status === 'IN_TRANSIT'
  const isLoading = isGenerating || isConfirming || isCancelling
  const canCancelNote = delivery.isNoticed && delivery.status === 'IN_TRANSIT'
  const canEditDelivery = ['CREATED', 'SCHEDULED', 'IN_TRANSIT'].includes(
    delivery.status,
  )
  const canGenerateInvoice =
    delivery.status === 'DELIVERED' && !delivery.isInvoiced

  const hasManualItems = delivery.items.some(
    (item: IDeliveryLineItem) =>
      item.isManualEntry || item.productCode === 'N/A' || !item.productCode,
  )
  async function handleGenerateInvoice(seriesName?: string) {
    setIsGeneratingInvoice(true)
    const toastId = `generate-invoice-${delivery._id}`
    toast.loading('Se generează factura...', { id: toastId })

    try {
      // 🔽 APELEAZĂ ACȚIUNEA DE SERVER (pe care am reparat-o) 🔽
      const result: InvoiceActionResult = await createInvoiceFromSingleNote(
        delivery._id.toString(), // Trimitem ID-ul Livrării
        seriesName,
      )

      if (result.success) {
        toast.success('Factura a fost generată cu succes!', { id: toastId })
        router.refresh()
      } else if ('requireSelection' in result && result.requireSelection) {
        toast.dismiss(toastId)
        setShowInvoiceSeriesModal(true) // Deschide modalul de facturi
      } else {
        toast.error(result.message || 'Eroare la generarea facturii', {
          id: toastId,
        })
      }
    } catch (err) {
      console.error('❌ Eroare la generare factură:', err)
      toast.error('Eroare internă la generarea facturii', {
        id: toastId,
      })
    }
    setIsGeneratingInvoice(false)
  }

  const handlePrintPreview = async (
    documentId: string,
    type: 'INVOICE' | 'DELIVERY_NOTE',
  ) => {
    setIsGeneratingPdf(true)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(documentId, type)

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
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'w-full h-full p-1 py-0 cursor-pointer text-left rounded-md bg-card shadow-md hover:shadow-lg transition-all',
            'flex flex-col gap-0 justify-center overflow-hidden',
            'border-l-4',
            {
              'border-red-500': delivery.status === 'SCHEDULED',
              'border-yellow-500': delivery.status === 'IN_TRANSIT',
              'border-green-500': delivery.status === 'DELIVERED',
              'border-blue-400': delivery.status === 'INVOICED',
              'border-white opacity-60': delivery.status === 'CANCELLED',
              'border-border': delivery.status === 'CREATED',
            },
          )}
          onClick={() => onSchedule(delivery)}
        >
          <div className='mb-0.5'>
            <p className='text-xs text-muted-foreground truncate flex items-center gap-1'>
              <User className='h-3 w-3 flex-shrink-0' />
              {delivery.clientSnapshot.name}
              <p className='text-[10px] text-muted-foreground/70 ml-4'>
                {delivery.clientSnapshot.cui}
              </p>
            </p>
          </div>
          <div>
            <p className='font-semibold text-xs truncate flex gap-1 items-center'>
              <Box className='h-4 w-3 flex-shrink-0' />
              Comanda nr. {delivery.deliveryNumber?.substring(0, 5)}
            </p>
            {delivery.deliveryNoteNumber && (
              <p className='font-bold text-[12px] font-mono flex gap-1 items-center mt-0.5'>
                <FileText className='h-3 w-3 flex-shrink-0' />
                Aviz {delivery.deliveryNoteNumber}
              </p>
            )}
          </div>
        </button>
      </TooltipTrigger>

      <TooltipContent className='max-w-xl p-4' side='right'>
        <div className='space-y-4 text-base'>
          <div className='flex justify-between items-center gap-2'>
            <div className='space-y-1'>
              <p className='text-lg font-semibold text-primary font-mono'>
                Comanda: {delivery.orderNumber}
              </p>
              <p className='text-sm font-mono text-muted-foreground -mt-1'>
                Livr: {delivery.deliveryNumber}
              </p>
              {delivery.deliveryNoteNumber && (
                <p className='text-sm font-mono  font-bold -mt-1'>
                  Aviz: {delivery.deliveryNoteNumber}
                </p>
              )}
            </div>
            <Badge
              variant={statusInfo.variant}
              className='self-start text-sm px-2 py-1'
            >
              {statusInfo.name}
            </Badge>
          </div>

          <div className='space-y-2 text-sm border-t pt-3 mt-3 text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <User className='h-4 w-4 flex-shrink-0' />
              <div className='font-medium text-foreground flex gap-20'>
                <span> {delivery.clientSnapshot.name} </span>
                <span>
                  {delivery.clientSnapshot.cui
                    ? `CUI: ${delivery.clientSnapshot.cui}`
                    : delivery.clientSnapshot.cnp
                      ? `CNP: ${delivery.clientSnapshot.cnp}`
                      : 'CUI/CNP Indisponibil'}
                </span>
              </div>
            </div>
            <div className='flex items-start gap-2'>
              <MapPin className='h-4 w-4 flex-shrink-0 mt-0.5' />{' '}
              <span className=''>{formattedAddress}</span>
            </div>
          </div>

          <div className='space-y-2 text-sm border-t pt-3 mt-3 text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <Truck className='h-4 w-4 flex-shrink-0' />
              <span className='font-medium text-foreground truncate'>
                Sofer: {delivery.driverName || 'N/A'} | Auto:{' '}
                {delivery.vehicleNumber || 'N/A'}{' '}
                {delivery.trailerNumber && (
                  <span>| Remorcă: {delivery.trailerNumber} </span>
                )}
              </span>
            </div>
            <div className='font-semibold text-foreground'>
              Programat: {delivery.deliverySlots?.join(', ')}
            </div>
          </div>

          <div className='border-t pt-3 mt-3 space-y-2 text-sm text-muted-foreground'>
            {delivery.deliveryNotes && (
              <p>
                <strong>Note Logistică:</strong> {delivery.deliveryNotes}
              </p>
            )}
            {hasManualItems && (
              <div className='bg-red-50 text-red-600 font-bold p-2 rounded-md border border-red-200 text-xs flex items-start gap-2 shadow-sm'>
                <AlertTriangle className='h-4 w-4 flex-shrink-0' />
                <p>NU FACTURA! PRODUSE ADĂUGATE MANUAL! TE ROG SĂ CORECTEZI!</p>
              </div>
            )}
            <p className='font-semibold pt-1'>Articole în livrare:</p>
            <ul className='list-disc list-inside space-y-1.5'>
              {delivery.items.map((item: IDeliveryLineItem) => {
                const isManual =
                  item.isManualEntry ||
                  !item.productCode ||
                  item.productCode === 'N/A'

                return (
                  <li
                    key={item._id.toString()}
                    className={isManual ? 'text-red-500 font-medium' : ''}
                  >
                    <span className='align-middle'>
                      {item.quantity} {item.unitOfMeasure} - {item.productName}
                    </span>

                    {isManual ? (
                      <Badge
                        variant='destructive'
                        className='ml-2 h-4 px-1.5 text-[9px] uppercase align-middle leading-none'
                      >
                        Rând manual
                      </Badge>
                    ) : (
                      <Badge
                        variant='secondary'
                        className='ml-2 h-4 px-1.5 text-[10px] font-mono align-middle leading-none'
                      >
                        Cod: {item.productCode}
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className='border-t pt-2 mt-2 space-y-1 text-muted-foreground'>
              <p>
                Livrare creată de {delivery.createdByName} la data de{' '}
                {format(new Date(delivery.createdAt), 'Pp', { locale: ro })}
              </p>

              {delivery.lastUpdatedByName && (
                <p>
                  Programată de {delivery.lastUpdatedByName} la data de{' '}
                  {format(new Date(delivery.updatedAt), 'Pp', { locale: ro })}
                </p>
              )}
            </div>
          </div>

          <div className='border-t pt-3 mt-3 grid grid-cols-3 items-center justify-end gap-2 text-muted-foreground'>
            {/* --- MODIFICĂ COMANDA (Link)  --- */}
            {canEditDelivery && (
              <Button
                size='sm'
                variant='outline'
                asChild
                onClick={(e) => e.stopPropagation()}
                disabled={isLoading}
              >
                <Link href={`/orders/${delivery.orderId.toString()}/edit`}>
                  <Pencil className='mr-2 h-4 w-4' /> Modifică Comanda
                </Link>
              </Button>
            )}
            {/* --- MODIFICĂ LIVRAREA --- */}
            {canEditDelivery && (
              <Button
                size='sm'
                variant='outline'
                asChild
                onClick={(e) => e.stopPropagation()}
                disabled={isLoading}
              >
                <Link
                  href={`/deliveries/new?orderId=${delivery.orderId.toString()}`}
                >
                  <FilePenLine className='mr-2 h-4 w-4' /> Modifică Livrarea
                </Link>
              </Button>
            )}
            {/* --- Butonul GENEREAZĂ AVIZ --- */}
            {canGenerateNote && (
              <Button
                size='sm'
                variant='outline'
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateDeliveryNote()
                }}
                disabled={isLoading} // Verificăm doar isLoading, deoarece 'canGenerateNote' e deja verificat
              >
                {isGenerating ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <FileText className='mr-2 h-4 w-4' />
                )}
                Generează Aviz
              </Button>
            )}{' '}
            {/* --- NOU: Butonul CONFIRMĂ (cu Alert Dialog) --- */}
            {canConfirmDelivery && (
              <Button
                size='sm'
                variant='outline'
                onClick={(e) => {
                  e.stopPropagation()
                  setShowConfirmModal(true)
                }}
                disabled={isLoading}
              >
                {isConfirming ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <CheckCircle2 className='mr-2 h-4 w-4' />
                )}
                Confirmă Livrarea
              </Button>
            )}
            {/* --- NOU: Butonul ANULEAZĂ AVIZ --- */}
            {canCancelNote && (
              <Button
                size='sm'
                variant='destructive'
                onClick={(e) => {
                  e.stopPropagation()
                  setShowCancelModal(true)
                }}
                disabled={isLoading}
              >
                {isCancelling ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <XCircle className='mr-2 h-4 w-4' />
                )}
                Anulează Aviz
              </Button>
            )}
            {/* --- STATUS: LIVRATĂ sau ÎN TRANZIT (Vezi & Descarcă Aviz) --- */}
            {(delivery.status === 'DELIVERED' ||
              delivery.status === 'IN_TRANSIT') &&
              delivery.deliveryNoteId && (
                <>
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full'
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/financial/delivery-notes/${delivery.deliveryNoteId}`}
                    >
                      <Eye className='mr-2 h-4 w-4 text-muted-foreground' />{' '}
                      <span className='text-muted-foreground'> Vezi Aviz</span>
                    </Link>
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full'
                    disabled={isGeneratingPdf}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (delivery.deliveryNoteId) {
                        handlePrintPreview(
                          delivery.deliveryNoteId.toString(),
                          'DELIVERY_NOTE',
                        )
                      }
                    }}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Printer className='mr-2 h-4 w-4 text-muted-foreground' />
                    )}
                    <span className='text-muted-foreground'>
                      Printează Aviz
                    </span>
                  </Button>
                </>
              )}
            {/* --- GENEREAZĂ FACTURĂ --- */}
            {canGenerateInvoice && (
              <Button
                size='sm'
                variant='outline'
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateInvoice() // Apelează funcția wrapper
                }}
                disabled={isLoading}
              >
                {isGeneratingInvoice ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <DollarSign className='mr-2 h-4 w-4 text-muted-foreground' />
                )}
                <span className='text-muted-foreground'>Generează Factură</span>
              </Button>
            )}
            {/* --- FACTURARE MULTIPLĂ (SPLIT) --- */}
            {canGenerateInvoice && (
              <Button
                size='sm'
                variant='outline'
                className='w-full col-span-3 mt-1 border-blue-200 hover:bg-blue-50'
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Link
                  href={`/financial/invoices/new?deliveryId=${delivery._id.toString()}`}
                >
                  <FilePenLine className='mr-2 h-4 w-4 text-muted-foreground' />
                  <span className='text-muted-foreground'>
                    Facturare Multiplă (Split)
                  </span>
                </Link>
              </Button>
            )}
            {/* --- STATUS: FACTURATĂ (Vezi & Descarcă Factura) --- */}
            {delivery.status === 'INVOICED' &&
              delivery.relatedInvoices?.length > 0 && (
                <>
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full'
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={`/financial/invoices/${delivery.relatedInvoices[0].invoiceId}`}
                    >
                      <Eye className='mr-2 h-4 w-4 text-muted-foreground' />{' '}
                      <span className='text-muted-foreground'>
                        Vezi Factura
                      </span>
                    </Link>
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className='w-full'
                    disabled={isGeneratingPdf}
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePrintPreview(
                        delivery.relatedInvoices[0].invoiceId.toString(),
                        'INVOICE',
                      )
                    }}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Printer className='mr-2 h-4 w-4 text-muted-foreground' />
                    )}
                    <span className='text-muted-foreground'>
                      {' '}
                      Printează Factura
                    </span>
                  </Button>
                </>
              )}
          </div>
        </div>
      </TooltipContent>

      {/* --- NOU: Legătura cu Modalul de Anulare --- */}
      {showCancelModal && (
        <CancelNoteModal
          isLoading={isCancelling}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={async (reason) => {
            if (isCancelling) return
            setIsCancelling(true)
            const toastId = `cancel-${delivery._id}`
            toast.loading('Se anulează avizul...', { id: toastId })

            try {
              // 🔽 --- APELEAZĂ NOUL WRAPPER --- 🔽
              const result = await cancelDeliveryNoteFromPlanner({
                deliveryId: `${delivery._id}`,
                reason: reason,
              })

              if (result.success) {
                toast.success('Avizul a fost anulat!', { id: toastId })
                setShowCancelModal(false)
                router.refresh()

                try {
                  await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        channel: ABLY_CHANNELS.PLANNER,
                        event: ABLY_EVENTS.DATA_CHANGED,
                        data: {
                          message: `Aviz anulat pentru ${delivery.deliveryNumber}.`,
                          deliveryId: delivery._id.toString(),
                          newStatus: 'SCHEDULED', // Avizul anulat readuce livrarea la 'SCHEDULED'
                          orderId: delivery.orderId.toString(),
                        },
                      }),
                    },
                  )
                } catch (ablyError) {
                  console.error(
                    'Ably fetch trigger error (cancelNote):',
                    ablyError,
                  )
                }
              } else {
                toast.error(result.message || 'Eroare la anularea avizului', {
                  id: toastId,
                })
              }
            } catch (err) {
              console.error('❌ Eroare la anulare aviz:', err)
              toast.error('Eroare internă la anularea avizului', {
                id: toastId,
              })
            }
            setIsCancelling(false)
          }}
        />
      )}
      {showConfirmModal && (
        <ConfirmDeliveryModal
          isLoading={isConfirming}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={async () => {
            setShowConfirmModal(false) // Închide modalul
            await handleConfirmDelivery() // Apelează funcția existentă
          }}
        />
      )}
      {showSeriesModal && (
        <SelectSeriesModal
          documentType='Aviz'
          onSelect={async (series, manualNumber) => {
            setShowSeriesModal(false)
            await handleGenerateDeliveryNote(series, manualNumber)
          }}
          onCancel={() => setShowSeriesModal(false)}
        />
      )}
      {showInvoiceSeriesModal && (
        <SelectSeriesModal
          documentType={'Factura' as unknown as DocumentType}
          onSelect={async (series) => {
            setShowInvoiceSeriesModal(false)
            await handleGenerateInvoice(series)
          }}
          onCancel={() => setShowInvoiceSeriesModal(false)}
        />
      )}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={printData}
        isLoading={false}
      />
    </Tooltip>
  )
}
