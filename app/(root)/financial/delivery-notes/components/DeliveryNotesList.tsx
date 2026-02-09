'use client'

import { useState, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { MoreHorizontal, Loader2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import {
  confirmDeliveryNote,
  cancelDeliveryNote,
  revokeDeliveryNoteConfirmation,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
import { DeliveryNotesFilters } from './DeliveryNotesFilters'
import { DeliveryNoteStatusBadge } from './DeliveryNoteStatusBadge'
import { ConfirmDeliveryModal } from '@/components/shared/modals/ConfirmDeliveryModal'
import { InvoiceActionResult } from '@/lib/db/modules/financial/invoices/invoice.types'
import { createInvoiceFromSingleNote } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { SelectSeriesModal } from '@/components/shared/modals/SelectSeriesModal'
import { DocumentType } from '@/lib/db/modules/numbering/documentCounter.model'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { useSession } from 'next-auth/react'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'
import Link from 'next/link'
import { DeliveryNotePreview } from './DeliveryNotePreview'

interface DeliveryNotesListProps {
  data: DeliveryNoteDTO[]
  totalPages: number
  currentPage: number
  currentUserId: string
  currentUserName: string
}

export function DeliveryNotesList({
  data,
  totalPages,
  currentPage,
  currentUserId,
  currentUserName,
}: DeliveryNotesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { data: session } = useSession()
  const userRole = session?.user?.role || ''
  const isSuperAdmin = SUPER_ADMIN_ROLES.some(
    (role) => role.toLowerCase() === userRole.toLowerCase().trim(),
  )

  // Stări pentru tranziții și încărcare (NU pentru date)
  const [isPending, startTransition] = useTransition()
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Stări pentru Modale
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [noteToCancel, setNoteToCancel] = useState<DeliveryNoteDTO | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [noteToConfirm, setNoteToConfirm] = useState<DeliveryNoteDTO | null>(
    null,
  )

  const [showInvoiceSeriesModal, setShowInvoiceSeriesModal] = useState(false)
  const [noteToInvoice, setNoteToInvoice] = useState<DeliveryNoteDTO | null>(
    null,
  )

  const [previewNote, setPreviewNote] = useState<DeliveryNoteDTO | null>(null)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)

  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [noteToRevoke, setNoteToRevoke] = useState<DeliveryNoteDTO | null>(null)

  // Funcție Navigare Pagini
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  // --- LOGICĂ ACȚIUNI ---

  const handleConfirmClick = (note: DeliveryNoteDTO) => {
    setNoteToConfirm(note)
    setIsConfirmModalOpen(true)
  }

  const executeConfirmation = () => {
    if (!noteToConfirm) return
    setActionLoadingId(noteToConfirm._id)
    startTransition(async () => {
      const result = await confirmDeliveryNote({
        deliveryNoteId: noteToConfirm._id,
        userId: currentUserId,
        userName: currentUserName,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare la confirmare', { description: result.message })
      }
      setIsConfirmModalOpen(false)
      setNoteToConfirm(null)
      setActionLoadingId(null)
    })
  }

  const handleCancel = () => {
    if (!noteToCancel) return
    setActionLoadingId(noteToCancel._id)
    startTransition(async () => {
      const result = await cancelDeliveryNote({
        deliveryNoteId: noteToCancel._id,
        reason: cancelReason,
        userId: currentUserId,
        userName: currentUserName,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare la anulare', { description: result.message })
      }
      setIsCancelModalOpen(false)
      setNoteToCancel(null)
      setCancelReason('')
      setActionLoadingId(null)
    })
  }

  const handleGenerateInvoice = async (
    note: DeliveryNoteDTO,
    seriesName?: string,
  ) => {
    if (actionLoadingId) return
    setActionLoadingId(note._id)
    const toastId = `invoice-${note._id}`
    toast.loading('Se generează factura...', { id: toastId })

    try {
      const result: InvoiceActionResult = await createInvoiceFromSingleNote(
        note.deliveryId,
        seriesName,
      )

      if (result.success) {
        toast.success('Factura a fost generată!', { id: toastId })
        router.refresh()
        setNoteToInvoice(null)
        setShowInvoiceSeriesModal(false)
      } else if ('requireSelection' in result && result.requireSelection) {
        toast.dismiss(toastId)
        setNoteToInvoice(note)
        setShowInvoiceSeriesModal(true)
      } else {
        toast.error(result.message || 'Eroare generare factură', {
          id: toastId,
        })
      }
    } catch (error) {
      console.error('Invoice generation error:', error)
      toast.error('Eroare internă.', { id: toastId })
    } finally {
      if (!showInvoiceSeriesModal) setActionLoadingId(null)
    }
  }

  const handlePrintPreview = async (noteId: string) => {
    setIsGeneratingPdf(noteId)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(noteId, 'DELIVERY_NOTE')
      if (result.success) {
        setPrintData(result.data)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor de printare.')
    } finally {
      setIsGeneratingPdf(null)
    }
  }

  const handleRevokeConfirmation = () => {
    if (!noteToRevoke) return
    setActionLoadingId(noteToRevoke._id)
    startTransition(async () => {
      const result = await revokeDeliveryNoteConfirmation({
        deliveryNoteId: noteToRevoke._id,
        userId: currentUserId,
        userName: currentUserName,
      })

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare la revocare', { description: result.message })
      }
      setIsRevokeModalOpen(false)
      setNoteToRevoke(null)
      setActionLoadingId(null)
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      <DeliveryNotesFilters />

      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead className='text-[10px] lg:text-xs xl:text-sm'>
                Serie - Nr.
              </TableHead>
              <TableHead className='text-[10px] lg:text-xs xl:text-sm'>
                Data Emiterii
              </TableHead>
              <TableHead className='text-[10px] lg:text-xs xl:text-sm'>
                Client
              </TableHead>
              <TableHead className='text-[10px] lg:text-xs xl:text-sm'>
                Agent
              </TableHead>
              <TableHead className='text-[10px] lg:text-xs xl:text-sm'>
                Status
              </TableHead>
              <TableHead className='text-[10px] lg:text-xs xl:text-sm'>
                Data Livrare
              </TableHead>
              <TableHead className='max-w-[300px] text-[10px] lg:text-xs xl:text-sm'>
                Adresa Livrare
              </TableHead>
              <TableHead className='text-right text-[10px] lg:text-xs xl:text-sm'>
                Acțiuni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center h-24'>
                  <Loader2 className='mx-auto h-6 w-6 animate-spin' />
                </TableCell>
              </TableRow>
            ) : data.length > 0 ? (
              data.map((note) => {
                const address = note.deliveryAddress
                const addressString = `Str. ${address.strada || '-'}, nr. ${address.numar || ''}, ${address.alteDetalii || ''}, ${address.localitate || ''}, ${address.judet || ''}`
                const formattedDeliveryDate = note.deliveryDate
                  ? new Date(note.deliveryDate).toLocaleDateString('ro-RO')
                  : '-'

                return (
                  <TableRow key={note._id} className='hover:bg-muted/50'>
                    <TableCell className='text-[10px] lg:text-xs xl:text-sm py-1'>
                      <div className='flex flex-col'>
                        <Link
                          href={`/financial/delivery-notes/${note._id}`}
                          className='font-medium hover:underline hover:text-primary transition-colors'
                        >
                          {note.seriesName}-{note.noteNumber}
                        </Link>

                        {note.deliveryNumberSnapshot && (
                          <span className='text-[8px] lg:text-[10px] xl:text-xs text-muted-foreground truncate max-w-[100px] lg:max-w-[100px]'>
                            Livr.: {note.deliveryNumberSnapshot}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='py-1 text-[10px] lg:text-xs xl:text-sm'>
                      {new Date(note.createdAt).toLocaleDateString('ro-RO')}
                    </TableCell>
                    <TableCell className='py-1 text-[10px] lg:text-xs xl:text-sm'>
                      {note.clientSnapshot?.name || 'N/A'}
                    </TableCell>
                    <TableCell className='py-1 text-[10px] lg:text-xs xl:text-sm'>
                      {note.salesAgentSnapshot?.name || 'N/A'}
                    </TableCell>
                    <TableCell className='py-1'>
                      <DeliveryNoteStatusBadge status={note.status} />
                    </TableCell>
                    <TableCell className='py-1 text-[10px] lg:text-xs xl:text-sm'>
                      {formattedDeliveryDate}
                    </TableCell>
                    <TableCell
                      className='max-w-[200px] xl:max-w-[300px] text-[10px] lg:text-xs xl:text-sm text-muted-foreground truncate py-1'
                      title={addressString}
                    >
                      {addressString}
                    </TableCell>
                    <TableCell className='text-right py-1'>
                      <div className='flex items-center justify-end gap-1'>
                        <DeliveryNotePreview note={note} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              disabled={!!actionLoadingId}
                            >
                              {actionLoadingId === note._id ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                              ) : (
                                <MoreHorizontal className='h-4 w-4' />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onSelect={() =>
                                router.push(
                                  `/financial/delivery-notes/${note._id}`,
                                )
                              }
                            >
                              Vizualizează
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                setPreviewNote(note)
                                handlePrintPreview(note._id)
                              }}
                              disabled={!!isGeneratingPdf}
                            >
                              Printează
                              {isGeneratingPdf === note._id && (
                                <Loader2 className='h-3 w-3 animate-spin ml-2' />
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {note.status === 'IN_TRANSIT' && (
                              <>
                                <DropdownMenuItem
                                  className='text-green-600'
                                  onSelect={() => handleConfirmClick(note)}
                                >
                                  Confirmă Livrarea
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className='text-destructive'
                                  onSelect={() => {
                                    setNoteToCancel(note)
                                    setIsCancelModalOpen(true)
                                  }}
                                >
                                  Anulează Avizul
                                </DropdownMenuItem>
                              </>
                            )}
                            {note.status === 'DELIVERED' &&
                              !note.isInvoiced && (
                                <>
                                  <DropdownMenuItem
                                    onSelect={() => handleGenerateInvoice(note)}
                                  >
                                    Generează Factură Automată
                                  </DropdownMenuItem>
                                  {isSuperAdmin && (
                                    <DropdownMenuItem
                                      className='text-red-500'
                                      onSelect={() => {
                                        setNoteToRevoke(note)
                                        setIsRevokeModalOpen(true)
                                      }}
                                    >
                                      Anulează Confirmarea
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-center h-24 text-muted-foreground'
                >
                  Niciun aviz găsit.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}

      {/* --- MODALE --- */}
      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare Aviz</AlertDialogTitle>
            <AlertDialogDescription>
              Sigur vrei să anulezi avizul {noteToCancel?.seriesName}-
              {noteToCancel?.noteNumber}?
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
            <AlertDialogCancel
              onClick={() => {
                setNoteToCancel(null)
                setCancelReason('')
              }}
            >
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className='bg-destructive'
              disabled={!cancelReason || cancelReason.length < 5}
            >
              Anulează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isConfirmModalOpen && (
        <ConfirmDeliveryModal
          onConfirm={executeConfirmation}
          onCancel={() => {
            setIsConfirmModalOpen(false)
            setNoteToConfirm(null)
          }}
          isLoading={!!actionLoadingId}
        />
      )}

      {showInvoiceSeriesModal && (
        <SelectSeriesModal
          documentType={'Factura' as unknown as DocumentType}
          onSelect={async (series) => {
            if (noteToInvoice)
              await handleGenerateInvoice(noteToInvoice, series)
          }}
          onCancel={() => {
            setShowInvoiceSeriesModal(false)
            setNoteToInvoice(null)
            setActionLoadingId(null)
          }}
        />
      )}

      {previewNote && (
        <PdfPreviewModal
          isOpen={!!previewNote}
          onClose={() => {
            setPreviewNote(null)
            setPrintData(null)
          }}
          data={printData}
          isLoading={isGeneratingPdf === previewNote._id}
        />
      )}

      <AlertDialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-orange-600'>
              Revocare Confirmare
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi livrarea pentru{' '}
              {noteToRevoke?.seriesName}-{noteToRevoke?.noteNumber}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToRevoke(null)}>
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirmation}
              className='bg-orange-600'
            >
              Confirmă Revocarea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
