'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import Link from 'next/link'
import type {
  PopulatedReception,
  ReceptionFilters,
} from '@/lib/db/modules/reception/types'
import { SearchFilters } from '@/components/shared/receptions/search-filters'
import { PAGE_SIZE } from '@/lib/constants'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { generateNirForReceptionAction } from '@/lib/db/modules/financial/nir/nir.actions'
import { Loader2, Printer } from 'lucide-react'
import { SelectSeriesModal } from '@/components/shared/modals/SelectSeriesModal'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

// ——— HELPER: calculează totalurile în RON pentru o recepție ———
function computeReceptionTotals(rec: PopulatedReception) {
  // 1) Dacă există facturi: folosim numai facturile (fără TVA + TVA), convertite în RON
  if (rec.invoices && rec.invoices.length > 0) {
    let invoicesNoVatRON = 0
    let invoicesVatRON = 0

    for (const inv of rec.invoices) {
      const amount = inv.amount ?? 0
      const rate = inv.vatRate ?? 0
      const fx =
        inv.currency === 'RON'
          ? 1
          : inv.exchangeRateOnIssueDate && inv.exchangeRateOnIssueDate > 0
            ? inv.exchangeRateOnIssueDate
            : 1 // dacă nu ai curs, îl tratăm ca 1 ca să nu-ți dea totaluri aiurea

      invoicesNoVatRON += amount * fx
      invoicesVatRON += amount * (rate / 100) * fx
    }

    return {
      // pentru consistență, oferim și breakdown-ul
      merchandiseRON: invoicesNoVatRON, // aici e "fără TVA", echivalent cu (produse+ambalaje+transport)
      transportRON: 0, // deja inclus în facturi la nivel de "fără TVA"
      vatRON: invoicesVatRON,
      generalRON: invoicesNoVatRON + invoicesVatRON,
    }
  }

  // 2) Fără facturi: calculăm (produse + ambalaje + transport + TVA linii) în RON
  const productsSum =
    (rec.products ?? []).reduce(
      (s, p) => s + (p.invoicePricePerUnit ?? 0) * (p.quantity ?? 0),
      0,
    ) || 0

  const packagingSum =
    (rec.packagingItems ?? []).reduce(
      (s, p) => s + (p.invoicePricePerUnit ?? 0) * (p.quantity ?? 0),
      0,
    ) || 0

  const transportSum =
    (rec.deliveries ?? []).reduce((s, d) => s + (d.transportCost || 0), 0) || 0

  // Dacă nu ai TVA pe linii, lasă 0 (sau calculează dacă ai câmpurile pe item).
  const vatSumRON = (rec.invoices ?? []).reduce((s, inv) => {
    const amount = inv.amount ?? 0
    const rate = inv.vatRate ?? 0
    const fx =
      inv.currency === 'RON'
        ? 1
        : inv.exchangeRateOnIssueDate && inv.exchangeRateOnIssueDate > 0
          ? inv.exchangeRateOnIssueDate
          : 1
    return s + amount * (rate / 100) * fx
  }, 0)

  const merchandiseRON = productsSum + packagingSum + transportSum
  const generalRON = merchandiseRON + vatSumRON

  return {
    merchandiseRON,
    transportRON: transportSum,
    vatRON: vatSumRON,
    generalRON,
  }
}

type ReceptionRow = PopulatedReception & {
  createdBy?: { _id: string; name: string }
  createdAt?: string
  nirNumber?: string
  nirDate?: string | Date
  nirId?: string
}

export default function ReceptionList() {
  const router = useRouter()
  const [receptions, setReceptions] = useState<PopulatedReception[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<ReceptionFilters>({
    q: '',
    status: 'ALL',
    createdBy: 'ALL',
    page: 1,
    pageSize: PAGE_SIZE,
  })
  const [nirModalOpen, setNirModalOpen] = useState(false)
  const [nirTargetRec, setNirTargetRec] = useState<string | null>(null)
  const [isGeneratingNir, setIsGeneratingNir] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReceptionRow | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ReceptionRow | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const debouncedFilters = useDebounce(filters, 300)
  const [previewRec, setPreviewRec] = useState<PopulatedReception | null>(null)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)

  const fetchReceptions = useCallback(
    async (currentFilters: ReceptionFilters) => {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: String(currentFilters.page),
        pageSize: String(currentFilters.pageSize),
        status: currentFilters.status || 'ALL',
        createdBy: currentFilters.createdBy || 'ALL',
        q: currentFilters.q || '',
      })

      try {
        const response = await fetch(
          `/api/admin/management/receptions/list?${params.toString()}`,
        )
        if (!response.ok) throw new Error('Eroare la preluarea recepțiilor')

        const result = await response.json()
        setReceptions(result.data)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      } catch (error) {
        toast.error((error as Error).message)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchReceptions(debouncedFilters)
  }, [debouncedFilters, fetchReceptions])

  const handleFiltersChange = useCallback(
    (newFilters: Partial<ReceptionFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
    },
    [],
  )

  function fetchPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    const promise = new Promise(async (resolve, reject) => {
      const res = await fetch(
        `/api/admin/management/receptions/${deleteTarget._id}`,
        { method: 'DELETE' },
      )

      if (!res.ok) {
        const errorData = await res.json()
        return reject(new Error(errorData.message || 'Eroare la server'))
      }

      resolve(res)
    })

    toast.promise(promise, {
      loading: 'Se șterge recepția...',
      success: () => {
        fetchReceptions(filters)
        setDeleteOpen(false)
        setDeleteTarget(null)
        return 'Recepția a fost ștearsă cu succes!'
      },
      error: (err) => {
        setDeleteOpen(false)
        setDeleteTarget(null)
        return err.message
      },
    })
  }

  async function handleRevokeConfirm() {
    if (!revokeTarget) return

    setIsRevoking(true) // Setează starea de încărcare la început
    const targetId = revokeTarget._id // Definim funcția de fetch pentru a o folosi cu toast.promise

    const revokePromise = async () => {
      const response = await fetch(
        `/api/admin/management/receptions/${targetId}/revoke`,
        { method: 'POST' },
      )

      if (!response.ok) {
        const result = await response.json() // Aruncăm o eroare care va fi prinsă de 'error' din toast.promise
        throw new Error(result.message || 'A apărut o eroare la revocare.')
      } // Nu este neapărat nevoie să returnăm ceva, dar putem returna true
      return true
    }

    try {
      await toast.promise(revokePromise(), {
        loading: 'Se revocă confirmarea...',
        success: () => {
          fetchReceptions(filters) // <-- Reîmprospătează lista automat

          toast.success('Recepție revocată!', {
            description: 'Recepția a fost adusă în starea "Ciornă" (Draft).',
            action: {
              label: 'Editează Acum',
              onClick: () =>
                router.push(`/admin/management/reception/${targetId}/edit`),
            },
            duration: 20000,
          })

          return 'Operațiune finalizată.'
        },
        error: (err) => err.message,
      })
    } catch (error) {
      // Acest bloc prinde erori neașteptate, deși toast.promise le gestionează pe majoritatea
      console.error('Revocarea a eșuat:', error)
    } finally {
      setIsRevoking(false) // Oprește starea de încărcare la final
      setRevokeTarget(null) // Închide dialogul
    }
  }
  // --- LOGICĂ GENERARE NIR ---
  async function handleGenerateNIR(receptionId: string, seriesName?: string) {
    setIsGeneratingNir(true)
    const toastId = toast.loading('Se generează NIR-ul...')

    try {
      const res = await generateNirForReceptionAction(receptionId, seriesName)

      if (!res.success) {
        if ('requireSelection' in res && res.requireSelection) {
          // Deschidem modalul dacă e nevoie de selecție
          setNirTargetRec(receptionId)
          setNirModalOpen(true)
          toast.dismiss(toastId)
        } else {
          toast.error(res.message, { id: toastId })
        }
      } else {
        toast.success('NIR generat cu succes!', { id: toastId })
        fetchReceptions(filters) // Refresh listă
        setNirModalOpen(false)
        setNirTargetRec(null)
      }
    } catch (error: any) {
      toast.error('Eroare: ' + error.message, { id: toastId })
    } finally {
      setIsGeneratingNir(false)
    }
  }
  // Handler pt modal
  const onSeriesSelected = (series: string) => {
    if (nirTargetRec) {
      handleGenerateNIR(nirTargetRec, series)
    }
  }

  // Placeholder pentru printare
  const handlePrintNirPdf = (nirId: string) => {
    toast.info('Printarea va fi implementată curând.', {
      description: `NIR ID: ${nirId}`,
    })
  }

  const handlePrintPreview = async (nirId: string) => {
    setIsGeneratingPdf(nirId)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(nirId, 'NIR')

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

  return (
    <div className='space-y-4'>
      {/* Header + filtre */}
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <h1 className='text-2xl font-bold'>Recepții</h1>

        <div className='flex gap-2'>
          <SearchFilters initial={filters} onChange={handleFiltersChange} />
          <Button
            variant='outline'
            onClick={() =>
              handleFiltersChange({
                q: '',
                status: 'ALL',
                createdBy: 'ALL',
                page: 1,
                pageSize: filters.pageSize,
              })
            }
          >
            Resetează
          </Button>
        </div>

        <Button asChild variant='default'>
          <Link href='/admin/management/reception/create'>
            Adaugă Recepție Nouă
          </Link>
        </Button>
      </div>

      {/* Info paginare */}
      <p className='text-sm text-muted-foreground'>
        Afișez{' '}
        {receptions.length > 0 ? (filters.page - 1) * filters.pageSize + 1 : 0}–
        {Math.min(filters.page * filters.pageSize, total)} din {total} recepții
      </p>

      {/* Tabel */}
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead>NIR</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Data Recepție</TableHead>
              <TableHead>Avize</TableHead>
              <TableHead>Facturi</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creat de</TableHead>
              <TableHead>Creat la</TableHead>
              <TableHead className='text-center'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className='h-24 text-center'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : receptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className='h-24 text-center'>
                  Nu s-au găsit recepții.
                </TableCell>
              </TableRow>
            ) : (
              receptions.map((rec) => {
                const deliveries = rec.deliveries ?? []
                const invoices = rec.invoices ?? []
                const totals = computeReceptionTotals(rec)

                return (
                  <TableRow key={rec._id}>
                    {/* --- COLOANĂ NIR --- */}
                    <TableCell className='py-1'>
                      {rec.nirNumber ? (
                        <div className='flex items-center gap-1'>
                          {/* Buton Print (Placeholder) */}
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 hover:bg-muted'
                            onClick={() => {
                              setPreviewRec(rec)
                              handlePrintPreview(rec.nirId!)
                            }}
                            disabled={!!isGeneratingPdf}
                            title='Printează NIR'
                          >
                            {isGeneratingPdf === rec.nirId ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <Printer className='h-4 w-4' />
                            )}
                          </Button>

                          {/* Link către Pagina de Detalii NIR */}
                          <div className='flex flex-col text-xs'>
                            <Link
                              href={`/admin/management/reception/nir/${rec.nirId}`}
                              className='font-semibold hover:underline'
                            >
                              {rec.nirNumber}
                            </Link>
                            {rec.nirDate && (
                              <span className='text-muted-foreground'>
                                {format(new Date(rec.nirDate), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className='text-xs text-muted-foreground italic pl-2'>
                          Ne-generat
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/management/reception/${rec._id}`}>
                        {rec.supplier?.name || '–'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {format(new Date(rec.receptionDate), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {deliveries.length > 0
                        ? deliveries.map((d, i) => (
                            <div key={i}>
                              {d.dispatchNoteSeries?.toUpperCase()}
                              {' - '}
                              {d.dispatchNoteNumber} –{' '}
                              {format(
                                new Date(d.dispatchNoteDate),
                                'dd/MM/yyyy',
                              )}
                            </div>
                          ))
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {invoices.length > 0
                        ? invoices.map((inv, i) => (
                            <div key={i}>
                              {inv.series?.toUpperCase()} – {inv.number} –{' '}
                              {format(new Date(inv.date), 'dd/MM/yyyy')}
                            </div>
                          ))
                        : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(totals.generalRON)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rec.status === 'DRAFT' ? 'secondary' : 'default'
                        }
                      >
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rec.createdByName || rec.createdBy?.name || '–'}
                    </TableCell>
                    <TableCell>
                      {rec.createdAt
                        ? format(new Date(rec.createdAt), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell className='text-center'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={(e) => e.stopPropagation()}
                          >
                            Acțiuni
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            className='cursor-pointer'
                            onSelect={() =>
                              router.push(
                                `/admin/management/reception/${rec._id}`,
                              )
                            }
                          >
                            Vizualizează
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='cursor-pointer'
                            onSelect={() =>
                              router.push(
                                `/admin/management/reception/${rec._id}/edit`,
                              )
                            }
                            disabled={rec.status === 'CONFIRMAT'}
                          >
                            Editează
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className='text-orange-400 focus:text-yellow-500 cursor-pointer'
                            onSelect={() => setRevokeTarget(rec)}
                            disabled={rec.status !== 'CONFIRMAT'}
                          >
                            Revocă Confirmarea
                          </DropdownMenuItem>
                          {/* --- ACȚIUNI NIR --- */}
                          {rec.status === 'CONFIRMAT' && !rec.nirNumber && (
                            <DropdownMenuItem
                              className='cursor-pointer text-emerald-600 focus:text-emerald-700'
                              onSelect={() => handleGenerateNIR(rec._id)}
                              disabled={isGeneratingNir}
                            >
                              Generează NIR
                            </DropdownMenuItem>
                          )}

                          {rec.nirNumber && (
                            <>
                              {rec.nirNumber && (
                                <>
                                  <DropdownMenuItem
                                    className='cursor-pointer'
                                    onSelect={() =>
                                      router.push(
                                        `/admin/management/reception/nir/${rec.nirId}`,
                                      )
                                    }
                                  >
                                    Vezi Detalii NIR
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    className='cursor-pointer'
                                    onSelect={() => {
                                      setPreviewRec(rec)
                                      handlePrintPreview(rec.nirId!)
                                    }}
                                    disabled={!!isGeneratingPdf}
                                  >
                                    <Printer className='mr-2 h-4 w-4' />{' '}
                                    Printează NIR
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className='text-red-500 focus:text-red-600 cursor-pointer'
                            onSelect={() => {
                              setDeleteTarget(rec)
                              setDeleteOpen(true)
                            }}
                            disabled={rec.status === 'CONFIRMAT'}
                          >
                            Șterge
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Ștergere */}
      {deleteTarget && (
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null)
            setDeleteOpen(open)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmare Ștergere</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune este ireversibilă și va șterge definitiv
                recepția. Ești sigur că vrei să continui?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Renunță</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant='destructive' onClick={handleDeleteConfirm}>
                  Șterge
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* --- DIALOG NOU PENTRU REVOCARE --- */}
      {revokeTarget && (
        <AlertDialog
          open={!!revokeTarget}
          onOpenChange={() => setRevokeTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmi revocarea?</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune va anula mișcările de stoc corespunzătoare și va
                readuce recepția la starea (Draft), permițând modificarea ei.
                Ești sigur?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeConfirm}
                disabled={isRevoking}
              >
                {isRevoking ? 'Se revocă...' : 'Da, revocă'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-4 mt-4'>
          <Button
            variant='outline'
            onClick={() => fetchPage(filters.page - 1)}
            disabled={filters.page <= 1 || isLoading}
          >
            Anterior
          </Button>
          <span>
            Pagina {filters.page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => fetchPage(filters.page + 1)}
            disabled={filters.page >= totalPages || isLoading}
          >
            Următor
          </Button>
        </div>
      )}
      {nirModalOpen && (
        <SelectSeriesModal
          documentType='NIR'
          onSelect={onSeriesSelected}
          onCancel={() => {
            setNirModalOpen(false)
            setNirTargetRec(null)
          }}
        />
      )}
      {previewRec && (
        <PdfPreviewModal
          isOpen={!!previewRec}
          onClose={() => {
            setPreviewRec(null)
            setPrintData(null)
          }}
          data={printData}
          isLoading={isGeneratingPdf === previewRec.nirId}
        />
      )}
    </div>
  )
}
