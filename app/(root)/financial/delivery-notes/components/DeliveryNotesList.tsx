'use client'

import { useState, useEffect, useTransition } from 'react'
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
import { MoreHorizontal, Loader2, DollarSign, Printer } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { DeliveryNoteDTO } from '@/lib/db/modules/financial/delivery-notes/delivery-note.types'
import {
  getDeliveryNotes,
  confirmDeliveryNote,
  cancelDeliveryNote,
  revokeDeliveryNoteConfirmation,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'
import {
  DeliveryNotesFilters,
  DeliveryNoteFiltersState,
} from './DeliveryNotesFilters'
import { DeliveryNoteStatusBadge } from './DeliveryNoteStatusBadge'
import { ConfirmDeliveryModal } from '@/components/shared/modals/ConfirmDeliveryModal'
import { InvoiceActionResult } from '@/lib/db/modules/financial/invoices/invoice.types'
import { createInvoiceFromSingleNote } from '@/lib/db/modules/financial/invoices/invoice.actions'
import { SelectSeriesModal } from '@/components/shared/modals/SelectSeriesModal'
import { DocumentType } from '@/lib/db/modules/numbering/documentCounter.model'
import { DeliveryNoteTemplate } from '@/components/printing/templates/DeliveryNoteTemplate'
import { mapDeliveryNoteToPdfData } from '@/lib/db/modules/printing/mappers/map-delivery-note'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { useSession } from 'next-auth/react'
import { SUPER_ADMIN_ROLES } from '@/lib/db/modules/user/user-roles'

interface DeliveryNotesListProps {
  initialData: {
    data: DeliveryNoteDTO[]
    totalPages: number
  }
  currentPage: number
  currentUserId: string
  currentUserName: string
}

export function DeliveryNotesList({
  initialData,
  currentPage,
  currentUserId,
  currentUserName,
}: DeliveryNotesListProps) {
  const router = useRouter()

  const { data: session } = useSession()
  const userRole = session?.user?.role || ''
  const isSuperAdmin = SUPER_ADMIN_ROLES.some(
    (role) => role.toLowerCase() === userRole.toLowerCase().trim(),
  )

  const [notes, setNotes] = useState<DeliveryNoteDTO[]>(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)

  // Stări pentru filtrare și paginare
  const [page, setPage] = useState(currentPage)
  const [filters, setFilters] = useState<DeliveryNoteFiltersState>({})
  const debouncedFilters = useDebounce(filters, 500)

  // Stări pentru tranziții și încărcare
  const [isPending, startTransition] = useTransition()
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Stări pentru Modale (Cancel)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [noteToCancel, setNoteToCancel] = useState<DeliveryNoteDTO | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [noteToConfirm, setNoteToConfirm] = useState<DeliveryNoteDTO | null>(
    null,
  )
  // Generare Factură
  const [showInvoiceSeriesModal, setShowInvoiceSeriesModal] = useState(false)
  const [noteToInvoice, setNoteToInvoice] = useState<DeliveryNoteDTO | null>(
    null,
  )
  const [previewNote, setPreviewNote] = useState<DeliveryNoteDTO | null>(null)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)
  // Stări pentru Revocare Confirmare
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false)
  const [noteToRevoke, setNoteToRevoke] = useState<DeliveryNoteDTO | null>(null)

  // 1. Efect: Fetch date când se schimbă filtrele sau pagina
  useEffect(() => {
    // Dacă suntem la prima randare și avem datele inițiale, nu facem fetch
    // Dar aici simplificăm: fetch mereu la schimbarea filtrelor/paginii client-side
    const fetchNotes = () => {
      startTransition(async () => {
        try {
          const result = await getDeliveryNotes(page, {
            ...debouncedFilters,
            status: debouncedFilters.status as any,
          })
          setNotes(result.data)
          setTotalPages(result.totalPages)
        } catch (error) {
          console.error('Failed to fetch delivery notes:', error)
          toast.error('Nu s-au putut încărca avizele.')
        }
      })
    }

    // Evităm double-fetch la mount dacă pag/filtre sunt default,
    // dar e safe să lăsăm așa pentru consistență la filtrare.
    fetchNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, page])

  // A. Doar deschide modalul (se pune pe butonul din meniu)
  const handleConfirmClick = (note: DeliveryNoteDTO) => {
    setNoteToConfirm(note)
    setIsConfirmModalOpen(true)
  }

  // B. Execută logica (se apelează din Modal)
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
        setNotes((prev) =>
          prev.map((n) =>
            n._id === noteToConfirm._id ? { ...n, status: 'DELIVERED' } : n,
          ),
        )
      } else {
        toast.error('Eroare la confirmare', { description: result.message })
      }

      // Resetare State
      setIsConfirmModalOpen(false)
      setNoteToConfirm(null)
      setActionLoadingId(null)
    })
  }
  // Reset pagina la filtrare nouă
  const handleFiltersChange = (
    newFilters: Partial<DeliveryNoteFiltersState>,
  ) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  // A. Confirmare (Livrat)
  const handleConfirm = (note: DeliveryNoteDTO) => {
    if (!confirm('Ești sigur că vrei să confirmi livrarea și să scazi stocul?'))
      return

    setActionLoadingId(note._id)
    startTransition(async () => {
      const result = await confirmDeliveryNote({
        deliveryNoteId: note._id,
        userId: currentUserId,
        userName: currentUserName,
      })

      if (result.success) {
        toast.success(result.message)
        // Actualizăm local lista
        setNotes((prev) =>
          prev.map((n) =>
            n._id === note._id ? { ...n, status: 'DELIVERED' } : n,
          ),
        )
      } else {
        toast.error('Eroare la confirmare', { description: result.message })
      }
      setActionLoadingId(null)
    })
  }

  // B. Anulare
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
        setNotes((prev) =>
          prev.map((n) =>
            n._id === noteToCancel._id ? { ...n, status: 'CANCELLED' } : n,
          ),
        )
      } else {
        toast.error('Eroare la anulare', { description: result.message })
      }
      // Cleanup Modal
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
      // Trimitem deliveryId, deoarece funcția din backend leagă factura de livrare
      const result: InvoiceActionResult = await createInvoiceFromSingleNote(
        note.deliveryId,
        seriesName,
      )

      if (result.success) {
        toast.success('Factura a fost generată!', { id: toastId })

        // Actualizăm local lista (Avizul devine INVOICED)
        setNotes((prev) =>
          prev.map((n) =>
            n._id === note._id
              ? { ...n, status: 'INVOICED', isInvoiced: true }
              : n,
          ),
        )
        // Resetăm selecția dacă a fost cazul
        setNoteToInvoice(null)
        setShowInvoiceSeriesModal(false)
      } else if ('requireSelection' in result && result.requireSelection) {
        // Dacă sunt mai multe serii, cerem utilizatorului să aleagă
        toast.dismiss(toastId)
        setNoteToInvoice(note) // Ținem minte la ce aviz lucrăm
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
      // Dacă nu am deschis modalul, oprim loading-ul.
      // Dacă am deschis modalul, loading-ul se oprește când se închide modalul sau se termină procesul.
      if (!showInvoiceSeriesModal) {
        setActionLoadingId(null)
      }
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
        // Nu mai avem nevoie de isPreviewOpenPdf separat, folosim previewNote pentru a randa modalul
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
        setNotes((prev) =>
          prev.map((n) =>
            n._id === noteToRevoke._id ? { ...n, status: 'IN_TRANSIT' } : n,
          ),
        )
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
      <DeliveryNotesFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isPending={isPending}
      />

      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Serie - Nr.</TableHead>
              <TableHead>Data Emiterii</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Livrare</TableHead>
              <TableHead className='max-w-[300px]'>Adresa Livrare</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && notes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center h-24'>
                  <Loader2 className='mx-auto h-6 w-6 animate-spin' />
                </TableCell>
              </TableRow>
            ) : notes.length > 0 ? (
              notes.map((note) => {
                // Construim string-ul adresei
                const address = note.deliveryAddress
                const addressString = `Str. ${address.strada || '-'}, nr. ${address.numar || ''}, ${address.alteDetalii || ''}, ${address.localitate || ''}, ${address.judet || ''}`
                // Formatam data livrarii (daca exista)
                const formattedDeliveryDate = note.deliveryDate
                  ? new Date(note.deliveryDate).toLocaleDateString('ro-RO')
                  : '-'

                return (
                  <TableRow key={note._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium'>
                      <div className='flex flex-col'>
                        <span>
                          {note.seriesName}-{note.noteNumber}
                        </span>
                        {note.deliveryNumberSnapshot && (
                          <span className='text-xs text-muted-foreground'>
                            Livrare: {note.deliveryNumberSnapshot}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(note.createdAt).toLocaleDateString('ro-RO')}
                    </TableCell>
                    <TableCell>{note.clientSnapshot?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {note.salesAgentSnapshot?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <DeliveryNoteStatusBadge status={note.status} />
                    </TableCell>

                    {/* Celula Data Livrare */}
                    <TableCell>{formattedDeliveryDate}</TableCell>

                    <TableCell className='max-w-[300px]'>
                      <div
                        className='truncate text-sm text-muted-foreground'
                        title={addressString}
                      >
                        {addressString}
                      </div>
                    </TableCell>

                    <TableCell className='text-right'>
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
                            className='cursor-pointer'
                            onSelect={() =>
                              router.push(
                                `/financial/delivery-notes/${note._id}`,
                              )
                            }
                          >
                            Vizualizează
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className='cursor-pointer'
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
                            <DropdownMenuItem
                              className='text-green-600 cursor-pointer focus:text-green-700'
                              onSelect={() => handleConfirmClick(note)}
                            >
                              Confirmă Livrarea
                            </DropdownMenuItem>
                          )}

                          {note.status === 'IN_TRANSIT' && (
                            <DropdownMenuItem
                              className='text-destructive cursor-pointer focus:text-destructive'
                              onSelect={() => {
                                setNoteToCancel(note)
                                setIsCancelModalOpen(true)
                              }}
                            >
                              Anulează Avizul
                            </DropdownMenuItem>
                          )}
                          {note.status === 'DELIVERED' && !note.isInvoiced && (
                            <>
                              <DropdownMenuItem
                                className='cursor-pointer'
                                onSelect={() => handleGenerateInvoice(note)}
                              >
                                Generează Factură Automată din Aviz
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuItem
                                    className='text-red-500 cursor-pointer focus:text-red-600'
                                    onSelect={() => {
                                      setNoteToRevoke(note)
                                      setIsRevokeModalOpen(true)
                                    }}
                                  >
                                    Anulează Confirmarea (Revocare)
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}

      {/* Modal Anulare */}
      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare Aviz</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi avizul{' '}
              <strong>
                {noteToCancel?.seriesName}-{noteToCancel?.noteNumber}
              </strong>
              ? Livrarea asociată va reveni la statusul "Programat".
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2'>
            <span className='text-sm font-medium mb-1 block'>
              Motiv anulare:
            </span>
            <Input
              placeholder='Ex: Marfă refuzată la primire...'
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
              className='bg-destructive hover:bg-destructive/90'
              disabled={!cancelReason || cancelReason.length < 5}
            >
              Anulează Documentul
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODALUL DE CONFIRMARE*/}
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
      {/* MODAL SELECTARE SERIE FACTURĂ */}
      {showInvoiceSeriesModal && (
        <SelectSeriesModal
          documentType={'Factura' as unknown as DocumentType}
          onSelect={async (series) => {
            // Când userul alege seria, re-apelăm funcția cu seria aleasă
            if (noteToInvoice) {
              await handleGenerateInvoice(noteToInvoice, series)
            }
            setActionLoadingId(null)
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

      {/* Modal Revocare Confirmare */}
      <AlertDialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-orange-600'>
              Revocare Confirmare Aviz
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-3'>
              <p>
                Ești sigur că vrei să anulezi confirmarea livrării pentru avizul{' '}
                <strong>
                  {noteToRevoke?.seriesName}-{noteToRevoke?.noteNumber}
                </strong>
                ?
              </p>
              <div className='bg-muted p-3 rounded-md text-xs space-y-2 border border-orange-200'>
                <p className='font-bold text-orange-800'>
                  Următoarele acțiuni vor avea loc:
                </p>
                <ul className='list-disc ml-4 space-y-1'>
                  <li>
                    Marfa va fi returnată în stocul fizic (inversare FIFO).
                  </li>
                  <li>
                    Statusul avizului și al livrării va reveni la{' '}
                    <strong>"În Tranzit"</strong>.
                  </li>
                  <li>
                    Comanda va reveni la statusul{' '}
                    <strong>"Livrată Parțial"</strong>.
                  </li>
                  <li>
                    Costurile de achiziție calculate anterior vor fi șterse.
                  </li>
                </ul>
              </div>
              <p className='text-sm text-destructive font-semibold'>
                Această acțiune este permisă doar administratorilor pentru
                corecția datelor.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToRevoke(null)}>
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirmation}
              className='bg-orange-600 hover:bg-orange-700'
            >
              Confirmă Revocarea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
