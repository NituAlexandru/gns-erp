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
  PopulatedInvoice,
  InvoiceFilters,
} from '@/lib/db/modules/financial/invoices/invoice.types'
import { ProformasFilters } from './ProformasFilters'
import { useDebounce } from '@/hooks/use-debounce'
import qs from 'query-string'
import { cn, formatCurrency } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { InvoiceStatusBadge } from '../../invoices/components/InvoiceStatusBadge' // Importăm Badge-ul existent
import { toast } from 'sonner'
import { cancelInvoice } from '@/lib/db/modules/financial/invoices/invoice.actions'
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
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface ProformasListProps {
  initialData: {
    data: PopulatedInvoice[]
    totalPages: number
  }
  currentPage: number
  isAdmin: boolean
}

export function ProformasList({
  initialData,
  currentPage,
  isAdmin,
}: ProformasListProps) {
  const router = useRouter()
  const [invoices, setInvoices] = useState<PopulatedInvoice[]>(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [queryParams, setQueryParams] = useState({
    page: currentPage,
  })
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const debouncedFilters = useDebounce(filters, 500)

  // State pentru Anulare
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [invoiceToActOn, setInvoiceToActOn] = useState<PopulatedInvoice | null>(
    null,
  )

  // State pentru PDF
  const [isPreviewOpenPdf, setIsPreviewOpenPdf] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)

  useEffect(() => {
    setQueryParams({ page: 1 })
  }, [debouncedFilters])

  useEffect(() => {
    const controller = new AbortController()
    if (typeof window !== 'undefined') {
      const fetchProformas = () => {
        startTransition(async () => {
          const url = qs.stringifyUrl(
            {
              url: '/api/invoices/proformas',
              query: {
                ...queryParams,
                ...debouncedFilters,
              },
            },
            { skipNull: true, skipEmptyString: true },
          )

          try {
            const res = await fetch(url, { signal: controller.signal })
            const result = await res.json()
            setInvoices(result.data || [])
            setTotalPages(result.totalPages || 0)
          } catch (error) {
            if ((error as Error).name !== 'AbortError') {
              console.error('Fetch error:', error)
              setInvoices([])
            }
          }
        })
      }
      fetchProformas()
    }
    return () => controller.abort()
  }, [queryParams, debouncedFilters])

  const handleFiltersChange = (newFilters: Partial<InvoiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  const handlePrintPreview = async (invoiceId: string) => {
    setIsGeneratingPdf(invoiceId)
    try {
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
      toast.error('Eroare la generarea PDF.')
    } finally {
      setIsGeneratingPdf(null)
    }
  }

  const handleCancel = () => {
    if (!invoiceToActOn) return
    startTransition(async () => {
      const result = await cancelInvoice(
        invoiceToActOn._id.toString(),
        cancelReason || 'Anulare manuală',
      )
      if (result.success) {
        toast.success(result.message)
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoiceToActOn._id
              ? { ...inv, status: 'CANCELLED' }
              : inv,
          ),
        )
      } else {
        toast.error('Eroare la anulare', { description: result.message })
      }
      setIsCancelModalOpen(false)
      setInvoiceToActOn(null)
      setCancelReason('')
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      <ProformasFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
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
              <TableHead className='text-right'>Total</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center h-24'>
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
                      <span className='text-[10px] text-yellow-600 font-bold uppercase tracking-wider'>
                        PROFORMĂ
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

                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(invoice.totals.grandTotal)}
                  </TableCell>

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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className='text-center h-24'>
                  Nu există proforme.
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
            onClick={() =>
              setQueryParams((prev) => ({
                ...prev,
                page: Math.max(1, prev.page - 1),
              }))
            }
            disabled={queryParams.page <= 1 || isPending}
          >
            Anterior
          </Button>

          <span className='text-sm'>
            Pagina {queryParams.page} din {totalPages}
          </span>

          <Button
            variant='outline'
            onClick={() =>
              setQueryParams((prev) => ({
                ...prev,
                page: Math.min(totalPages, prev.page + 1),
              }))
            }
            disabled={queryParams.page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}

      {/* Modal Anulare */}
      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare Proformă</AlertDialogTitle>
            <AlertDialogDescription>
              Sigur vrei să anulezi proforma {invoiceToActOn?.seriesName}-
              {invoiceToActOn?.invoiceNumber}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-2'>
            <Input
              placeholder='Motiv (opțional)...'
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInvoiceToActOn(null)}>
              Renunță
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>
              Confirmă Anularea
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
