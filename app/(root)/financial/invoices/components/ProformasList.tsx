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
import { PopulatedInvoice } from '@/lib/db/modules/financial/invoices/invoice.types'
import { ProformasFilters } from './ProformasFilters'
import { formatCurrency } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { InvoiceStatusBadge } from '../../invoices/components/InvoiceStatusBadge'
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
  invoices: PopulatedInvoice[]
  totalPages: number
  currentPage: number
  isAdmin: boolean
  totalFilteredSum: number
}

export function ProformasList({
  invoices,
  totalPages,
  currentPage,
  isAdmin,
  totalFilteredSum,
}: ProformasListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [invoiceToActOn, setInvoiceToActOn] = useState<PopulatedInvoice | null>(
    null,
  )
  const [isPreviewOpenPdf, setIsPreviewOpenPdf] = useState(false)
  const [printData, setPrintData] = useState<any>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  // --- ACȚIUNI ---
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
        router.refresh()
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
      <ProformasFilters />

      {/* 2. Afișare Total */}
      <div className='flex justify-start'>
        <div className='bg-muted/50 px-3 py-1 rounded text-sm font-medium border border-border'>
          Total Proforme Filtrate:{' '}
          <span className='text-primary font-bold'>
            {formatCurrency(totalFilteredSum)}
          </span>
        </div>
      </div>

      {/* 3. Tabelul */}
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
            {invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow
                  key={invoice._id.toString()}
                  className='hover:bg-muted/50'
                >
                  <TableCell className='font-medium py-1'>
                    <div className='flex flex-col'>
                      <span>
                        {invoice.seriesName}-{invoice.invoiceNumber}
                      </span>
                      <span className='text-[10px] text-yellow-600 font-bold uppercase tracking-wider'>
                        PROFORMĂ
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className='py-1'>
                    {new Date(invoice.invoiceDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell className='py-1'>
                    {new Date(invoice.dueDate).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell className='py-1'>
                    {invoice.clientId?.name || 'N/A'}
                  </TableCell>
                  <TableCell className='py-1'>
                    {invoice.createdByName || 'N/A'}
                  </TableCell>
                  <TableCell className='py-1'>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className='text-right font-semibold py-1'>
                    {formatCurrency(invoice.totals.grandTotal)}
                  </TableCell>
                  <TableCell className='text-right py-1'>
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
                          onSelect={() => {
                            setInvoiceToActOn(invoice)
                            setIsCancelModalOpen(true)
                          }}
                        >
                          Anulează
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

      {/* 4. Paginarea */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Următor
          </Button>
        </div>
      )}

      {/* 5. Modale */}
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
