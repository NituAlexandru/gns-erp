'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
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
  receipts: ReceiptDTO[]
  totalPages: number
  currentPage: number
  totalSum: number
}

export function ReceiptsList({
  receipts,
  totalPages,
  currentPage,
  totalSum,
}: ReceiptsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [receiptToCancel, setReceiptToCancel] = useState<ReceiptDTO | null>(
    null,
  )
  const [cancelReason, setCancelReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptDTO | null>(null)
  const [printData, setPrintData] = useState<PdfDocumentData | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null)
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== currentPage
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(currentPage.toString())
    }
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
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
    <div className='flex flex-col gap-1 min-h-[calc(100vh-12rem)] w-full'>
      <div className='flex justify-start'>
        <div className='bg-muted/50 px-2 py-2 rounded-md border text-xs'>
          Total Încasări:{' '}
          <span className='font-bold text-xs ml-2'>
            {formatCurrency(totalSum)}
          </span>
        </div>
      </div>
      <div className='flex-1 border rounded-lg overflow-auto bg-card [&>div]:h-full'>
        <Table className='h-full'>
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
            {receipts.length > 0 ? (
              receipts.map((receipt) => (
                <TableRow key={receipt._id} className='hover:bg-muted/50'>
                  <TableCell className='font-medium py-0'>
                    <Link
                      href={`/financial/receipts/${receipt._id}`}
                      className='hover:underline '
                    >
                      {receipt.series}-{receipt.number}
                    </Link>
                  </TableCell>
                  <TableCell className='py-0'>
                    {format(new Date(receipt.date), 'dd.MM.yyyy', {
                      locale: ro,
                    })}
                  </TableCell>
                  <TableCell className='py-0'>
                    <div className='flex flex-col leading-none justify-center h-full py-1'>
                      <span className='font-medium'>
                        {receipt.clientSnapshot.name}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {receipt.clientSnapshot.cui}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className='max-w-[200px] truncate py-0'
                    title={receipt.explanation}
                  >
                    {receipt.explanation}
                  </TableCell>
                  <TableCell className='text-right font-mono font-bold py-0'>
                    {formatCurrency(receipt.amount)}
                  </TableCell>
                  <TableCell className='py-0'>
                    <ReceiptStatusBadge status={receipt.status} />
                  </TableCell>
                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-6 min-h-0'
                        >
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
                  className='text-center h-24 text-muted-foreground py-0'
                >
                  Nu există chitanțe emise.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-1 mt-auto border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin mr-1' />
            ) : (
              <ChevronLeft className='h-4 w-4 mr-1' />
            )}
            Anterior
          </Button>

          <div className='flex items-center gap-2 text-sm text-muted-foreground mx-2'>
            <span>Pagina</span>
            <Input
              value={jumpInputValue}
              onChange={(e) => setJumpInputValue(e.target.value)}
              onBlur={handleJump}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              className='w-10 h-8 text-center px-1'
              disabled={isPending}
            />
            <span>din {totalPages}</span>
          </div>

          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin ml-1' />
            ) : (
              <ChevronRight className='h-4 w-4 ml-1' />
            )}
          </Button>

          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage >= totalPages || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
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
