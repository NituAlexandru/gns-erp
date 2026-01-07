'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
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
  DropdownMenuTrigger,
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
import { Input } from '@/components/ui/input'
import {
  MoreHorizontal,
  FileText,
  Plus,
  Ban,
  Loader2,
  Printer,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { ReceiptDTO } from '@/lib/db/modules/financial/receipts/receipt.types'
import { ReceiptStatusBadge } from './ReceiptStatusBadge'
import Link from 'next/link'
import { toast } from 'sonner'
import { cancelReceipt } from '@/lib/db/modules/financial/receipts/receipt.actions'
import { PdfDocumentData } from '@/lib/db/modules/printing/printing.types'
import { PdfPreviewModal } from '@/components/printing/PdfPreviewModal'

interface ReceiptsListProps {
  initialData: {
    data: ReceiptDTO[]
    totalPages: number
  }
  currentPage: number
}

export function ReceiptsList({ initialData, currentPage }: ReceiptsListProps) {
  const router = useRouter()
  const [data, setData] = useState<ReceiptDTO[]>(initialData.data)
  const [totalPages] = useState(initialData.totalPages)
  const [page, setPage] = useState(currentPage)
  // State pentru Modalul de Anulare
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [receiptToCancel, setReceiptToCancel] = useState<ReceiptDTO | null>(
    null
  )
  const [cancelReason, setCancelReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptDTO | null>(null)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)

  useEffect(() => {
    setData(initialData.data)
  }, [initialData])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    router.push(`/financial/receipts?page=${newPage}`)
  }

  // Deschide modalul
  const onCancelClick = (receipt: ReceiptDTO) => {
    setReceiptToCancel(receipt)
    setCancelReason('')
    setIsCancelOpen(true)
  }

  // Execută anularea
  const handleConfirmCancel = () => {
    if (!receiptToCancel) return

    startTransition(async () => {
      // 1. Apelăm backend-ul
      const result = await cancelReceipt({
        receiptId: receiptToCancel._id,
        reason: cancelReason,
      })

      if (result.success) {
        toast.success(result.message)

        // 2. Închidem modalul
        setIsCancelOpen(false)
        setReceiptToCancel(null)

        // 3. Cerem Next.js să re-aducă datele reale din DB
        // Asta va declanșa useEffect-ul de sus care va actualiza tabelul
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }
  const handlePrintPreview = async (receiptId: string) => {
    setIsGeneratingPdf(receiptId)
    try {
      const { getPrintData } = await import(
        '@/lib/db/modules/printing/printing.actions'
      )
      const result = await getPrintData(receiptId, 'RECEIPT')

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
      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Serie - Număr</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Explicație</TableHead>
              <TableHead className='text-right'>Sumă</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((receipt) => (
                <TableRow key={receipt._id} className='hover:bg-muted/50'>
                  <TableCell className='font-medium'>
                    <Link
                      href={`/financial/receipts/${receipt._id}`}
                      className='hover:underline '
                    >
                      {receipt.series}-{receipt.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {format(new Date(receipt.date), 'dd.MM.yyyy', {
                      locale: ro,
                    })}
                  </TableCell>
                  <TableCell>
                    <div className='flex flex-col'>
                      <span className='font-medium'>
                        {receipt.clientSnapshot.name}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {receipt.clientSnapshot.cui}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className='max-w-[200px] truncate'
                    title={receipt.explanation}
                  >
                    {receipt.explanation}
                  </TableCell>
                  <TableCell className='text-right font-mono font-bold'>
                    {formatCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell>
                    <ReceiptStatusBadge status={receipt.status} />
                  </TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {/* 1. VEZI DETALII - Acum activ */}
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/financial/receipts/${receipt._id}`}
                            className='cursor-pointer flex items-center'
                          >
                            <FileText className='mr-2 h-4 w-4' /> Vezi Detalii
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className='cursor-pointer'
                          onSelect={() => {
                            setPreviewReceipt(receipt)
                            handlePrintPreview(receipt._id)
                          }}
                          disabled={!!isGeneratingPdf}
                        >
                          <Printer className='mr-2 h-4 w-4' />
                          {isGeneratingPdf === receipt._id
                            ? 'Se generează...'
                            : 'Printează Chitanța'}
                        </DropdownMenuItem>
                        {/* 2. ANULEAZĂ - Doar dacă e VALID */}
                        {receipt.status === 'VALID' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onCancelClick(receipt)}
                              className='text-destructive focus:text-destructive cursor-pointer'
                            >
                              <Ban className='mr-2 h-4 w-4' /> Anulează Chitanța
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className='text-center h-24 text-muted-foreground'
                >
                  Nu există chitanțe emise.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare Simplă */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            Următor
          </Button>
        </div>
      )}

      {/* MODAL ANULARE */}
      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulare Chitanță</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi chitanța{' '}
              <strong>
                {receiptToCancel?.series}-{receiptToCancel?.number}
              </strong>
              ? Această acțiune este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className='py-2'>
            <label className='text-sm font-medium mb-1.5 block'>
              Motiv Anulare:
            </label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder='Ex: Greșeală operare, returnare bani...'
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Renunță</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault() // Prevenim închiderea automată
                handleConfirmCancel()
              }}
              disabled={!cancelReason || cancelReason.length < 3 || isPending}
              className='bg-destructive hover:bg-destructive/90'
            >
              {isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                'Confirmă Anularea'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {previewReceipt && (
        <PdfPreviewModal
          isOpen={!!previewReceipt}
          onClose={() => {
            setPreviewReceipt(null)
            setPrintData(null)
          }}
          data={printData}
          isLoading={isGeneratingPdf === previewReceipt._id}
        />
      )}
    </div>
  )
}
