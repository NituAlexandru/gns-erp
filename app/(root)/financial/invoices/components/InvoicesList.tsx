'use client'

import React, { useState, useEffect, useTransition } from 'react'
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
  PopulatedInvoice,
  InvoiceFilters,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import { InvoicesFilters } from './InvoicesFilters'
import { useDebounce } from '@/hooks/use-debounce'
import qs from 'query-string'
import { cn, formatCurrency } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import {
  Download,
  Info,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { EFacturaStatusBadge } from './EFacturaStatusBadge'
import { toast } from 'sonner'
import {
  approveInvoice,
  cancelInvoice,
  rejectInvoice,
} from '@/lib/db/modules/financial/invoices/invoice.actions'
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
import {
  getMarginColorClass,
  getProfitColorClass,
} from '@/lib/db/modules/financial/invoices/invoice.utils'
import {
  downloadOutgoingResult,
  getOutgoingPreviewData,
  updateOutgoingStatus,
  uploadInvoiceToAnaf,
} from '@/lib/db/modules/setting/efactura/outgoing/outgoing.actions'
import { ParsedAnafInvoice } from '@/lib/db/modules/setting/efactura/anaf.types'
import { AnafPreviewModal } from '@/app/admin/management/incasari-si-plati/payables/components/AnafPreviewModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  cancelSplitGroup,
  getSplitGroupPreview,
} from '@/lib/db/modules/financial/invoices/split-invoice/split-invoice.actions'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface InvoicesListProps {
  initialData: {
    data: PopulatedInvoice[]
    totalPages: number
  }
  currentPage: number
  isAdmin: boolean // Vom folosi asta pentru aprobări
}

export function InvoicesList({
  initialData,
  currentPage,
  isAdmin,
}: InvoicesListProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<PopulatedInvoice[]>(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(currentPage)
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const debouncedFilters = useDebounce(filters, 500)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [invoiceToActOn, setInvoiceToActOn] = useState<PopulatedInvoice | null>(
    null
  )
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [isBulkRefreshing, setIsBulkRefreshing] = useState(false)
  const [previewData, setPreviewData] = useState<ParsedAnafInvoice | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSplitCancelModalOpen, setIsSplitCancelModalOpen] = useState(false)
  const [groupInvoicesList, setGroupInvoicesList] = useState<any[]>([])
  const [isPreviewOpenPdf, setIsPreviewOpenPdf] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)

  // useEffect(() => {
  //   setInvoices(initialData.data)
  //   setTotalPages(initialData.totalPages)
  // }, [initialData])

  const handleShowError = (errorMsg: string | undefined) => {
    setCurrentError(errorMsg || 'Eroare necunoscută.')
    setErrorModalOpen(true)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fetchInvoices = () => {
        startTransition(async () => {
          const url = qs.stringifyUrl(
            {
              url: '/api/invoices',
              query: { ...debouncedFilters, page },
            },
            { skipNull: true, skipEmptyString: true }
          )

          try {
            const res = await fetch(url)
            const result = await res.json()
            setInvoices(result.data || [])
            setTotalPages(result.totalPages || 0)
          } catch (error) {
            console.error('Failed to fetch filtered invoices:', error)
            setInvoices([])
            setTotalPages(0)
          }
        })
      }
      fetchInvoices()
    }
  }, [debouncedFilters, page])

  const handleFiltersChange = (newFilters: Partial<InvoiceFilters>) => {
    setPage(1) // Resetează pagina la orice filtru nou
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const handleApprove = (invoice: PopulatedInvoice) => {
    startTransition(async () => {
      const result = await approveInvoice(invoice._id.toString())
      if (result.success) {
        toast.success(result.message)
        // Actualizăm datele local, fără un re-fetch complet
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoice._id
              ? { ...inv, status: 'APPROVED', eFacturaStatus: 'PENDING' }
              : inv
          )
        )
      } else {
        toast.error('Eroare la aprobare', { description: result.message })
      }
    })
  }

  const handleReject = () => {
    if (!invoiceToActOn) return
    startTransition(async () => {
      const result = await rejectInvoice(
        invoiceToActOn._id.toString(),
        rejectionReason
      )
      if (result.success) {
        toast.success(result.message)
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoiceToActOn._id
              ? { ...inv, status: 'REJECTED', rejectionReason: rejectionReason }
              : inv
          )
        )
      } else {
        toast.error('Eroare la respingere', { description: result.message })
      }
      setIsRejectModalOpen(false)
      setInvoiceToActOn(null)
      setRejectionReason('')
    })
  }

  const handleUploadToAnaf = async (invoice: PopulatedInvoice) => {
    if (actionLoadingId) return // Previne dublu-click
    setActionLoadingId(invoice._id.toString())

    try {
      const result = await uploadInvoiceToAnaf(invoice._id.toString())

      if (result.success) {
        toast.success('Trimisă la ANAF!', { description: result.message })

        // Actualizăm interfața local (fără refresh la pagină)
        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv._id === invoice._id) {
              // Încercăm să extragem ID-ul din mesaj pentru a-l afișa imediat
              const match = result.message.match(/Index:\s*(\d+)/)
              const uploadId = match ? match[1] : 'PENDING...'

              return {
                ...inv,
                eFacturaStatus: 'SENT',
                eFacturaUploadId: uploadId,
              }
            }
            return inv
          })
        )
      } else {
        toast.error('Eroare ANAF', { description: result.message })
        // Putem marca vizual eroarea
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoice._id
              ? { ...inv, eFacturaStatus: 'REJECTED_ANAF' }
              : inv
          )
        )
      }
    } catch (err) {
      toast.error('Eroare de comunicare', { description: String(err) })
    } finally {
      setActionLoadingId(null)
    }
  }
  // --- HANDLER 2: DOWNLOAD ZIP ---
  const handleDownloadZip = async (invoice: PopulatedInvoice) => {
    if (actionLoadingId) return
    setActionLoadingId(invoice._id.toString())
    toast.info('Se descarcă arhiva...')

    try {
      const result = await downloadOutgoingResult(invoice._id.toString())

      if (result.success && result.data) {
        // Magie: Convertim Base64 primit de la server într-un fișier descărcabil
        const binaryString = window.atob(result.data)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'application/zip' })

        // Creăm un link invizibil și dăm click pe el automat
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download =
          result.fileName || `Factura_${invoice.invoiceNumber}.zip`
        document.body.appendChild(link)
        link.click()

        // Curățenie
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success('Descărcare finalizată.')
      } else {
        toast.error('Eroare descărcare', { description: result.message })
      }
    } catch (err) {
      toast.error('Eroare', { description: String(err) })
    } finally {
      setActionLoadingId(null)
    }
  }
  // --- HANDLER 3: CHECK STATUS ---
  const handleCheckStatus = async (invoice: PopulatedInvoice) => {
    if (actionLoadingId) return
    setActionLoadingId(invoice._id.toString())
    toast.info('Se verifică statusul la ANAF...')

    try {
      const result = await updateOutgoingStatus(invoice._id.toString())

      if (result.success) {
        toast.success(`Status ANAF: ${result.status}`, {
          description: result.message,
        })

        // Dacă s-a schimbat statusul (ok/nok), actualizăm UI-ul
        if (result.status === 'ok') {
          setInvoices((prev) =>
            prev.map((inv) =>
              inv._id === invoice._id
                ? { ...inv, eFacturaStatus: 'ACCEPTED' }
                : inv
            )
          )
        } else if (result.status === 'nok') {
          setInvoices((prev) =>
            prev.map((inv) =>
              inv._id === invoice._id
                ? { ...inv, eFacturaStatus: 'REJECTED_ANAF' }
                : inv
            )
          )
        }
      } else {
        toast.warning('Verificare nereușită', { description: result.message })
      }
    } catch (err) {
      toast.error('Eroare', { description: String(err) })
    } finally {
      setActionLoadingId(null)
    }
  }
  // --- HANDLER 4: PREVIEW XML ---
  const handlePreviewXml = async (invoiceId: string) => {
    toast.loading('Se pregătește previzualizarea...')
    const result = await getOutgoingPreviewData(invoiceId)
    toast.dismiss()

    if (result.success && result.data) {
      setPreviewData(result.data)
      setIsPreviewOpen(true)
    } else {
      toast.error('Eroare previzualizare', { description: result.message })
    }
  }
  const handleCancel = () => {
    if (!invoiceToActOn) return

    startTransition(async () => {
      const result = await cancelInvoice(
        invoiceToActOn._id.toString(),
        cancelReason || 'Anulare manuală din listă'
      )

      if (result.success) {
        toast.success(result.message)
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoiceToActOn._id
              ? {
                  ...inv,
                  status: 'CANCELLED',
                  eFacturaStatus: 'NOT_REQUIRED',
                }
              : inv
          )
        )
      } else {
        toast.error('Eroare la anulare', { description: result.message })
      }

      setIsCancelModalOpen(false)
      setInvoiceToActOn(null)
      setCancelReason('')
    })
  }
  const handlePrepareCancel = (invoice: PopulatedInvoice) => {
    // 1. Dacă e factură din SPLIT -> Pregătim modalul de Grup
    if (invoice.splitGroupId) {
      startTransition(async () => {
        toast.loading('Se încarcă detaliile grupului...')
        const result = await getSplitGroupPreview(
          invoice.splitGroupId!.toString()
        )
        toast.dismiss()

        if (result.success) {
          setGroupInvoicesList(result.data)
          setInvoiceToActOn(invoice) // Ținem minte factura curentă (ca referință)
          setIsSplitCancelModalOpen(true)
        } else {
          toast.error('Nu s-au putut încărca detaliile grupului split.')
        }
      })
    }
    // 2. Dacă e factură NORMALĂ -> Deschidem modalul simplu
    else {
      setInvoiceToActOn(invoice)
      setCancelReason('')
      setIsCancelModalOpen(true)
    }
  }
  // Handler-ul efectiv pentru Anularea de Grup (din Listă)
  const handleConfirmSplitCancel = () => {
    if (!invoiceToActOn?.splitGroupId) return

    startTransition(async () => {
      const result = await cancelSplitGroup(
        invoiceToActOn.splitGroupId!.toString()
      )

      if (result.success) {
        toast.success(result.message)

        // Actualizăm local TOATE facturile care au fost anulate (ca să nu dăm refresh)
        // Backend-ul a anulat tot grupul, deci căutăm în lista locală toate facturile cu acel splitGroupId
        setInvoices((prev) =>
          prev.map((inv) =>
            // Dacă au același splitGroupId, le marcăm pe toate ca anulate
            inv.splitGroupId === invoiceToActOn.splitGroupId
              ? {
                  ...inv,
                  status: 'CANCELLED',
                  eFacturaStatus: 'NOT_REQUIRED',
                }
              : inv
          )
        )
      } else {
        toast.error('Eroare la anulare grup', { description: result.message })
      }

      setIsSplitCancelModalOpen(false)
      setInvoiceToActOn(null)
    })
  }

  const handlePrintPreview = async (invoiceId: string) => {
    setIsGeneratingPdf(invoiceId)
    try {
      // Folosim același action ca în pagina de detalii
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(invoiceId, 'INVOICE')

      if (result.success) {
        setPrintData(result.data)
        setIsPreviewOpenPdf(true)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Eroare la generarea datelor de printare.')
    } finally {
      setIsGeneratingPdf(null)
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <InvoicesFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onBulkRefreshLoading={setIsBulkRefreshing}
      />

      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Serie - Nr.</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Scadență</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>eFactura</TableHead>
              <TableHead>Acțiuni / ID</TableHead>
              <TableHead className='text-right'>Total</TableHead>
              {isAdmin && (
                <>
                  <TableHead className='text-right'>Profit</TableHead>
                  <TableHead className='text-right'>Marjă</TableHead>
                </>
              )}
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={9} className='text-center h-24'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice._id.toString()}
                  className='hover:bg-muted/50'
                >
                  <TableCell className='font-medium'>
                    <div className='flex flex-col'>
                      <span>
                        {invoice.seriesName}-{invoice.invoiceNumber}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {invoice.invoiceType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>{invoice.clientId?.name || 'N/A'}</TableCell>
                  <TableCell>{invoice.createdByName || 'N/A'}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  {/* COLOANA 1: STATUS EFACTURA */}
                  <TableCell>
                    <div
                      className={cn(
                        'inline-block',
                        // Adăugăm cursor special doar dacă e respinsă, ca să știe că poate da click/hover
                        invoice.eFacturaStatus === 'REJECTED_ANAF' &&
                          'cursor-help'
                      )}
                      // 1. TOOLTIP PE BADGE
                      title={
                        invoice.eFacturaStatus === 'REJECTED_ANAF'
                          ? invoice.eFacturaError
                          : undefined
                      }
                      // 2. CLICK PE BADGE (Deschide Modalul)
                      onClick={() => {
                        if (invoice.eFacturaStatus === 'REJECTED_ANAF') {
                          handleShowError(invoice.eFacturaError)
                        }
                      }}
                    >
                      <EFacturaStatusBadge status={invoice.eFacturaStatus} />
                    </div>
                  </TableCell>

                  {/* COLOANA 2: ACȚIUNI (Curățat de erori) */}
                  <TableCell>
                    {isAdmin ? (
                      <div className='flex gap-1 items-start '>
                        {/* A. Buton UPLOAD (Doar acțiunea de trimitere) */}
                        {(invoice.eFacturaStatus === 'PENDING' ||
                          invoice.eFacturaStatus === 'REJECTED_ANAF') && (
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-7 w-7'
                            // MODIFICAT: Tooltip simplu de acțiune, FĂRĂ EROARE
                            title='Trimite factura în SPV'
                            disabled={
                              actionLoadingId === invoice._id.toString() ||
                              !(
                                invoice.status === 'APPROVED' ||
                                invoice.status === 'PAID' ||
                                invoice.status === 'PARTIAL_PAID'
                              )
                            }
                            onClick={() => handleUploadToAnaf(invoice)}
                          >
                            {actionLoadingId === invoice._id.toString() ? (
                              <Loader2 className='h-3 w-3 animate-spin' />
                            ) : (
                              <Upload className='h-4 w-4' />
                            )}
                          </Button>
                        )}

                        {/* B. Zona ID + DOWNLOAD + REFRESH (Dedesubt) */}
                        {(invoice.eFacturaStatus === 'SENT' ||
                          invoice.eFacturaStatus === 'ACCEPTED' ||
                          (invoice.eFacturaStatus === 'REJECTED_ANAF' &&
                            invoice.eFacturaUploadId)) &&
                          invoice.eFacturaUploadId && (
                            <div className='flex items-center gap-1'>
                              {/* Buton Download ZIP / ID */}
                              <div
                                className={cn(
                                  'text-[10px] font-mono border px-2 py-1 rounded flex items-center gap-1 transition-colors h-7',
                                  'hover:bg-primary/10 hover:text-primary cursor-pointer',
                                  'bg-muted text-muted-foreground'
                                )}
                                onClick={() => handleDownloadZip(invoice)}
                                title='Descarcă XML / ZIP'
                              >
                                {actionLoadingId === invoice._id.toString() ? (
                                  <Loader2 className='h-3 w-3 animate-spin' />
                                ) : (
                                  <Download className='h-3 w-3' />
                                )}
                                <span>{invoice.eFacturaUploadId}</span>
                              </div>

                              {/* Buton Refresh (Doar dacă e SENT) */}
                              {invoice.eFacturaStatus === 'SENT' && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-7 w-7 hover:bg-muted'
                                  title='Verifică status ANAF'
                                  disabled={
                                    actionLoadingId ===
                                      invoice._id.toString() || isBulkRefreshing
                                  }
                                  onClick={() => handleCheckStatus(invoice)}
                                >
                                  <RefreshCw
                                    className={cn(
                                      'h-3 w-3',
                                      (actionLoadingId ===
                                        invoice._id.toString() ||
                                        isBulkRefreshing) &&
                                        'animate-spin'
                                    )}
                                  />
                                </Button>
                              )}
                            </div>
                          )}
                      </div>
                    ) : (
                      <span className='text-muted-foreground text-xs'>-</span>
                    )}
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(invoice.totals.grandTotal)}
                  </TableCell>
                  {isAdmin && (
                    <>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          getProfitColorClass(invoice.totals.totalProfit)
                        )}
                      >
                        {invoice.invoiceType !== 'STORNO'
                          ? formatCurrency(invoice.totals.totalProfit)
                          : '-'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right text-xs',
                          getMarginColorClass(invoice.totals.profitMargin)
                        )}
                      >
                        {invoice.invoiceType !== 'STORNO'
                          ? `${invoice.totals.profitMargin}%`
                          : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(`/financial/invoices/${invoice._id}`)
                          }
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            handlePrintPreview(invoice._id.toString())
                          }
                          disabled={!!isGeneratingPdf}
                        >
                          <div className='flex items-center justify-between w-full'>
                            <span>Printează PDF</span>
                            {isGeneratingPdf === invoice._id.toString() && (
                              <Loader2 className='h-3 w-3 animate-spin ml-2' />
                            )}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            handlePreviewXml(invoice._id.toString())
                          }
                          disabled={!invoice.eFacturaUploadId} // Activ doar dacă s-a încercat trimiterea
                        >
                          Vezi XML e-Factura
                        </DropdownMenuItem>
                        {invoice.eFacturaStatus === 'REJECTED_ANAF' && (
                          <DropdownMenuItem
                            className='text-red-600 focus:text-red-700'
                            onSelect={() =>
                              handleShowError(invoice.eFacturaError)
                            }
                          >
                            Vezi Erori ANAF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(
                              `/financial/invoices/${invoice._id.toString()}/edit`
                            )
                          }
                          disabled={
                            invoice.status !== 'CREATED' &&
                            invoice.status !== 'REJECTED'
                          }
                        >
                          Modifică
                        </DropdownMenuItem>

                        {/* --- ÎNCEPUT BLOC ACȚIUNI ADMIN --- */}
                        {/* Afișăm aceste acțiuni doar dacă ești admin */}
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='text-green-600 focus:text-green-700'
                              onSelect={() => handleApprove(invoice)}
                              disabled={
                                invoice.status !== 'CREATED' &&
                                invoice.status !== 'REJECTED'
                              }
                            >
                              Aprobă Factura
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive'
                              onSelect={() => {
                                setInvoiceToActOn(invoice)
                                setIsRejectModalOpen(true)
                              }}
                              disabled={invoice.status !== 'CREATED'}
                            >
                              Respinge Factura
                            </DropdownMenuItem>
                          </>
                        )}
                        {/* --- SFÂRȘIT BLOC ACȚIUNI ADMIN --- */}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-600 focus:text-red-700 focus:bg-red-50'
                          onSelect={() => handlePrepareCancel(invoice)}
                          disabled={
                            invoice.status === 'CANCELLED' ||
                            invoice.status === 'PAID' ||
                            invoice.status === 'PARTIAL_PAID' ||
                            invoice.status === 'APPROVED' ||
                            ['SENT', 'ACCEPTED'].includes(
                              invoice.eFacturaStatus
                            )
                          }
                        >
                          {/* Putem schimba textul dinamic dacă vrei */}
                          {invoice.splitGroupId
                            ? 'Anulează Grup Split'
                            : 'Anulează Factura'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className='text-center h-24'>
                  Nicio factură găsită.
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
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

      <AlertDialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Respinge Factura</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să respingi factura{' '}
              <strong>
                {invoiceToActOn?.seriesName}-{invoiceToActOn?.invoiceNumber}
              </strong>
              ? Te rugăm introdu un motiv.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder='Motivul respingerii (obligatoriu)...'
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setInvoiceToActOn(null)
                setRejectionReason('')
              }}
            >
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isPending || rejectionReason.length < 3}
            >
              {isPending ? 'Se respinge...' : 'Da, respinge factura'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AnafPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={previewData}
      />
      <Dialog open={errorModalOpen} onOpenChange={setErrorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-destructive'>
              <Info className='h-5 w-5' />
              Eroare Validare ANAF
            </DialogTitle>
            <DialogDescription>
              Detalii despre eroarea returnată de serverul ANAF.
            </DialogDescription>
          </DialogHeader>

          <div className=' rounded-md text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto'>
            {currentError}
          </div>

          <div className='flex justify-end mt-4'>
            <Button variant='outline' onClick={() => setErrorModalOpen(false)}>
              Închide
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-destructive'>
              Anulare Factură
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi factura{' '}
              <strong>
                {invoiceToActOn?.seriesName}-{invoiceToActOn?.invoiceNumber}
              </strong>
              ?
              <br />
              <br />
              <ul className='list-disc list-inside text-sm text-muted-foreground'>
                <li>
                  Statusul va deveni <strong>ANULATĂ</strong>.
                </li>
                <li>Factura nu va mai fi trimisă la ANAF.</li>
                <li>
                  <strong>Avizele asociate vor fi eliberate</strong> (status
                  Livrat) și pot fi refacturate.
                </li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2'>
            <Input
              placeholder='Motivul anulării (opțional)...'
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setInvoiceToActOn(null)
                setCancelReason('')
              }}
            >
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className='bg-destructive hover:bg-destructive/90'
              disabled={isPending}
            >
              {isPending ? 'Se anulează...' : 'Confirmă Anularea'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* --- MODAL ANULARE GRUP SPLIT --- */}
      <AlertDialog
        open={isSplitCancelModalOpen}
        onOpenChange={setIsSplitCancelModalOpen}
      >
        <AlertDialogContent className='max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare Grup Facturi Split</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-sm text-muted-foreground'>
                <p className='mb-3'>
                  Această factură face parte dintr-un grup. Acțiunea va anula{' '}
                  <strong>toate facturile</strong> de mai jos:
                </p>

                {/* LISTA FACTURILOR */}
                <div className='bg-muted/30 rounded-md border p-3 mb-4 space-y-2 max-h-[200px] overflow-y-auto'>
                  {groupInvoicesList.map((inv) => (
                    <div
                      key={inv.id}
                      className='flex justify-between items-center text-xs'
                    >
                      <div className='flex flex-col'>
                        <span className='font-semibold text-foreground'>
                          #{inv.number} / {inv.date}
                        </span>
                        <span className='truncate max-w-[200px]'>
                          {inv.clientName}
                        </span>
                      </div>
                      <div className='font-mono font-medium'>
                        {formatCurrency(inv.total)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className='flex items-start gap-2 text-amber-600 bg-amber-50 p-2 rounded border border-amber-200'>
                  <div className='mt-1.5'>
                    <Trash2 className='h-5 w-5' />
                  </div>
                  <p className='text-xs'>
                    Avizele și Livrările asociate vor reveni la starea{' '}
                    <strong>NEFACTURAT</strong> (Livrat) și vor putea fi
                    preluate pe o nouă factură.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToActOn(null)}>
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSplitCancel}
              className='bg-primary hover:bg-destructive/90'
              disabled={isPending}
            >
              {isPending ? 'Se anulează...' : 'Da, Anulează Tot Grupul'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PdfPreviewModal
        isOpen={isPreviewOpenPdf}
        onClose={() => setIsPreviewOpenPdf(false)}
        data={printData}
        isLoading={false}
      />
    </div>
  )
}
