'use client'

import { useState, useTransition, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  DropdownMenuLabel,
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
import type { PopulatedReception } from '@/lib/db/modules/reception/types'
import { SearchFilters } from '@/components/shared/receptions/search-filters'
import { PAGE_SIZE } from '@/lib/constants'
import { toast } from 'sonner'
import {
  cancelNirAction,
  generateNirForReceptionAction,
  syncNirFromReceptionAction,
} from '@/lib/db/modules/financial/nir/nir.actions'
import { Eye, Loader2, Printer } from 'lucide-react'
import { SelectSeriesModal } from '@/components/shared/modals/SelectSeriesModal'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { ReceptionPreviewCard } from './ReceptionPreviewCard'

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

interface ReceptionListProps {
  initialData: {
    data: PopulatedReception[]
    total: number
    totalPages: number
    currentPage: number
  }
}

export default function ReceptionList({ initialData }: ReceptionListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [nirModalOpen, setNirModalOpen] = useState(false)
  const [nirTargetRec, setNirTargetRec] = useState<string | null>(null)
  const [isGeneratingNir, setIsGeneratingNir] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ReceptionRow | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ReceptionRow | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [previewRec, setPreviewRec] = useState<PopulatedReception | null>(null)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)
  const [showNirChoice, setShowNirChoice] = useState(false)

  const receptions = initialData.data
  const total = initialData.total
  const totalPages = initialData.totalPages
  const currentPage = initialData.currentPage
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleUpdateParams = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== 'ALL') {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })

    // Resetăm la pagina 1 dacă schimbăm filtrele (dar nu și dacă schimbăm doar pagina)
    if (!newParams.page) {
      params.set('page', '1')
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
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
        router.refresh()
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

  // 1. Logica de decizie (Intermediară)
  const handleRevokeConfirm = () => {
    if (!revokeTarget) return

    // Dacă are NIR, închidem primul modal și îl deschidem pe al doilea
    if (revokeTarget.nirId) {
      setShowNirChoice(true)
    } else {
      executeRevocation(true)
    }
  }

  // 2. Funcția care face fetch-ul efectiv (Execuția)
  async function executeRevocation(cancelNir: boolean) {
    if (!revokeTarget) return
    setIsRevoking(true)

    const targetId = revokeTarget._id

    const revokePromise = async () => {
      const response = await fetch(
        `/api/admin/management/receptions/${targetId}/revoke`,
        {
          method: 'POST',
          body: JSON.stringify({ shouldCancelNir: cancelNir }),
        },
      )

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.message || 'A apărut o eroare la revocare.')
      }
      return true
    }

    try {
      await toast.promise(revokePromise(), {
        loading: 'Se revocă confirmarea...',
        success: () => {
          router.refresh()
          return cancelNir
            ? 'Recepție revocată și NIR anulat.'
            : 'Recepție revocată. NIR-ul a fost păstrat.'
        },
        error: (err) => err.message,
      })
    } catch (error) {
      console.error('Revocarea a eșuat:', error)
    } finally {
      setIsRevoking(false)
      setRevokeTarget(null)
      setShowNirChoice(false)
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
        router.refresh()
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

  const handleCancelNirOnly = async (nirId: string) => {
    const promise = cancelNirAction(nirId)
    toast.promise(promise, {
      loading: 'Se anulează NIR-ul...',
      success: (res) => {
        if (!res.success) throw new Error(res.message)
        router.refresh()
        return 'NIR anulat cu succes (Recepția a rămas intactă).'
      },
      error: (err) => err.message,
    })
  }

  const handleSyncNir = async (receptionId: string, nirId: string) => {
    const promise = syncNirFromReceptionAction(receptionId, nirId)
    toast.promise(promise, {
      loading: 'Se actualizează NIR-ul din recepție...',
      success: (res) => {
        if (!res.success) throw new Error(res.message)
        router.refresh()
        return 'Datele din NIR au fost resincronizate.'
      },
      error: (err) => err.message,
    })
  }

  const handleEditNirManual = (nirId: string) => {
    router.push(`/admin/management/reception/nir/${nirId}/edit`)
  }

  return (
    <div className='flex flex-col h-[calc(100vh-100px)] space-y-4'>
      {/* Header + filtre */}
      <div className='flex flex-col justify-between gap-1 mb-1'>
        <h1 className='text-2xl font-bold'>Recepții</h1>
        <div className='flex flex-col xl:flex-row justify-between gap-4'>
          <div className='flex gap-2'>
            <SearchFilters
              initial={{
                q: searchParams.get('q') || '',
                status: searchParams.get('status') || 'ALL',
                createdBy: searchParams.get('createdBy') || 'ALL',
                page: Number(searchParams.get('page')) || 1,
                pageSize: PAGE_SIZE,
                from: searchParams.get('from') || '',
                to: searchParams.get('to') || '',
                dateType: searchParams.get('dateType') || 'reception',
              }}
              onChange={(newValues) => handleUpdateParams(newValues as any)}
            />
            <Button
              variant='outline'
              onClick={() =>
                handleUpdateParams({
                  q: '',
                  status: 'ALL',
                  createdBy: 'ALL',
                  page: 1,
                  from: '',
                  to: '',
                })
              }
            >
              Resetează
            </Button>
          </div>

          <div className='flex gap-2'>
            <Button asChild variant='default'>
              <Link href='/admin/management/reception/nir/create'>
                Adaugă NIR (Manual)
              </Link>
            </Button>

            {/* Butonul vechi de Recepție */}
            <Button asChild variant='default'>
              <Link href='/admin/management/reception/create'>
                Adaugă Recepție Nouă
              </Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Info paginare */}
      <p className='text-sm text-muted-foreground mb-1'>
        Afișez {receptions.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
        {Math.min(currentPage * PAGE_SIZE, total)} din {total} recepții
      </p>
      {/* Tabel */}
      <div className='overflow-x-auto flex-1'>
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
            {isPending ? (
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
                  <TableRow
                    key={rec._id}
                    className='even:bg-muted/50 hover:bg-muted'
                  >
                    {/* --- COLOANĂ NIR --- */}
                    <TableCell className='py-1.5'>
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
                    <TableCell className='py-1.5 text-xs 2xl:text-sm max-w-[150px]'>
                      <TooltipProvider>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/admin/management/reception/${rec._id}`}
                              className='block truncate w-full hover:underline'
                            >
                              {rec.supplier?.name || '–'}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{rec.supplier?.name || '–'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className='py-1.5 text-xs 2xl:text-sm'>
                      {format(new Date(rec.receptionDate), 'dd/MM/yyyy ')}
                    </TableCell>
                    <TableCell className='py-1.5 text-xs 2xl:text-sm'>
                      {deliveries.length > 0
                        ? deliveries.map((d, i) => (
                            <div key={i} className='leading-tight'>
                              {[
                                d.dispatchNoteSeries?.toUpperCase(),
                                d.dispatchNoteNumber,
                              ]
                                .filter(Boolean)
                                .join(' - ')}

                              {' – '}
                              {format(
                                new Date(d.dispatchNoteDate),
                                'dd/MM/yyyy',
                              )}
                            </div>
                          ))
                        : '-'}
                    </TableCell>
                    <TableCell className='py-1.5 text-xs 2xl:text-sm'>
                      {invoices.length > 0
                        ? invoices.map((inv, i) => (
                            <div key={i} className='leading-tight'>
                              {[inv.series?.toUpperCase(), inv.number]
                                .filter(Boolean)
                                .join(' - ')}

                              {' – '}
                              {format(new Date(inv.date), 'dd/MM/yyyy')}
                            </div>
                          ))
                        : '-'}
                    </TableCell>
                    <TableCell className='py-1.5 text-xs 2xl:text-sm'>
                      {formatCurrency(totals.generalRON)}
                    </TableCell>
                    <TableCell className='py-1.5 text-xs 2xl:text-sm'>
                      <Badge
                        variant={
                          rec.status === 'DRAFT' ? 'secondary' : 'default'
                        }
                      >
                        {rec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className='py-1.5 text-xs 2xl:text-sm'>
                      {rec.createdByName || rec.createdBy?.name || '–'}
                    </TableCell>
                    <TableCell className='py-1.5 text-xs 2xl:text-sm'>
                      {rec.createdAt
                        ? format(new Date(rec.createdAt), 'dd/MM/yyyy ')
                        : '-'}
                    </TableCell>
                    <TableCell className='text-center py-1.5'>
                      <div className='flex items-center justify-center gap-1'>
                        {/* --- PREVIEW CARD --- */}
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-7 w-7'
                            >
                              <Eye className='h-4 w-4 text-muted-foreground hover:text-primary transition-colors' />
                            </Button>
                          </HoverCardTrigger>
                          <HoverCardContent
                            side='left'
                            align='start'
                            sideOffset={16}
                            alignOffset={-10}
                            collisionPadding={20}
                            className='w-auto max-w-none p-0 border-none shadow-xl bg-transparent z-50'
                          >
                            <ReceptionPreviewCard reception={rec} />
                          </HoverCardContent>
                        </HoverCard>
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

                            {rec.nirNumber && rec.nirId && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className='hidden text-xs text-muted-foreground ml-2'>
                                  Opțiuni NIR
                                </DropdownMenuLabel>

                                {/* 1. Vizualizare */}
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

                                {/* 2. Actualizare (Sync) */}
                                <DropdownMenuItem
                                  className='cursor-pointer'
                                  onSelect={() =>
                                    handleSyncNir(rec._id, rec.nirId!)
                                  }
                                  disabled={rec.status !== 'CONFIRMAT'} // Nu actualizam daca receptia nu e confirmata (teoretic)
                                >
                                  Actualizează din Recepție
                                </DropdownMenuItem>

                                {/* 3. Modificare Manuală */}
                                <DropdownMenuItem
                                  className='cursor-pointer'
                                  onSelect={() =>
                                    handleEditNirManual(rec.nirId!)
                                  }
                                >
                                  Modifică NIR (Manual)
                                </DropdownMenuItem>

                                {/* 4. Print */}
                                <DropdownMenuItem
                                  className='cursor-pointer'
                                  onSelect={() => {
                                    setPreviewRec(rec)
                                    handlePrintPreview(rec.nirId!)
                                  }}
                                  disabled={!!isGeneratingPdf}
                                >
                                  Printează NIR
                                </DropdownMenuItem>

                                {/* 5. Anulare NIR */}
                                <DropdownMenuItem
                                  className='text-red-600 focus:text-red-700 cursor-pointer'
                                  onSelect={() =>
                                    handleCancelNirOnly(rec.nirId!)
                                  }
                                >
                                  Anulează NIR
                                </DropdownMenuItem>
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
                        </DropdownMenu>{' '}
                      </div>
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

      {/* --- MODAL 1: CONFIRMARE STANDARD (Apare doar dacă NU suntem la alegere NIR) --- */}
      {revokeTarget && !showNirChoice && (
        <AlertDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setRevokeTarget(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmi revocarea?</AlertDialogTitle>
              <AlertDialogDescription>
                Această acțiune va anula mișcările de stoc corespunzătoare și va
                readuce recepția la starea (Draft).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anulează</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleRevokeConfirm()
                }}
              >
                Da, revocă
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* --- MODAL 2: DECIZIE NIR (Apare doar dacă suntem la pasul 2) --- */}
      {revokeTarget && showNirChoice && (
        <AlertDialog
          open={true}
          onOpenChange={() => {
            setShowNirChoice(false)
            setRevokeTarget(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-red-600'>
                Recepția are NIR generat!
              </AlertDialogTitle>
              <AlertDialogDescription>
                Există deja documentul NIR <b>{revokeTarget.nirNumber}</b>{' '}
                asociat.
                <br />
                Cum dorești să procedezi cu documentul contabil?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className='flex-col gap-2 sm:gap-0 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                disabled={isRevoking}
                onClick={() => executeRevocation(false)}
              >
                Păstrează NIR-ul
              </Button>

              <Button
                variant='destructive'
                className='sm:ml-2'
                disabled={isRevoking}
                onClick={() => executeRevocation(true)}
              >
                {isRevoking ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  'Anulează și NIR-ul'
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-4 mt-auto py-4'>
          <Button
            variant='outline'
            onClick={() => handleUpdateParams({ page: currentPage - 1 })}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handleUpdateParams({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages || isPending}
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
