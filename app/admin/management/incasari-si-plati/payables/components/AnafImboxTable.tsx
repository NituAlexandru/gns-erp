'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, Eye } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AnafProcessingStatus } from '@/lib/db/modules/setting/efactura/anaf.constants'
import {
  retryProcessMessage,
  previewAnafInvoice,
} from '@/lib/db/modules/setting/efactura/anaf.actions'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'
import { toast } from 'sonner'

// Definim tipul direct aici sau îl importăm
interface InboxErrorItem {
  _id: string
  data_creare: string
  cui_emitent: string
  titlu: string
  processing_status: AnafProcessingStatus
  processing_error?: string
}

interface AnafInboxTableProps {
  data: {
    data: InboxErrorItem[]
    totalPages: number
    total: number
  }
}

export function AnafInboxTable({ data }: AnafInboxTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentPage = Number(searchParams.get('page')) || 1

  const [isNavigating, setIsNavigating] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handlePageChange = (newPage: number) => {
    setIsNavigating(true)
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
    setIsNavigating(false)
  }

  // Handler pentru reîncercare procesare
  const handleRetry = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await retryProcessMessage(id)
      if (res.success) {
        toast.success('Mesaj procesat cu succes! S-a creat factura.')
        router.refresh()
      } else {
        toast.error(`Eroare: ${res.error}`)
      }
    } catch (e) {
      toast.error('Eroare de conexiune.')
    } finally {
      setProcessingId(null)
    }
  }

  // Handler pentru preview (doar console log momentan sau implementare viitoare)
  const handlePreview = async (id: string) => {
    setProcessingId(id)
    try {
      const res = await previewAnafInvoice(id)
      if (res.success) {
        console.log('Preview Data:', res.data)
        toast.info('Verifică consola browserului pentru structura XML (Debug).')
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error('Eroare preview.')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant='success'>Procesat</Badge>
      case 'UNPROCESSED':
        return <Badge variant='secondary'>Nou</Badge>
      case 'ERROR_NO_SUPPLIER':
        return <Badge variant='destructive'>Lipsă Furnizor</Badge>
      default:
        return <Badge variant='destructive'>Eroare</Badge>
    }
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative'>
        <table className='w-full caption-bottom text-sm text-left'>
          <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
            <TableRow className='bg-muted/50'>
              <TableHead className='w-[50px]'>#</TableHead>
              <TableHead>Dată Mesaj</TableHead>
              <TableHead>Emitent (CUI)</TableHead>
              <TableHead>Titlu / Detalii</TableHead>
              <TableHead>Status Procesare</TableHead>
              <TableHead className='w-[50px]'>Act.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-center h-24 text-muted-foreground py-1'
                >
                  Nu există mesaje neprocesate.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((msg, index) => {
                const globalIndex =
                  (currentPage - 1) * PAYABLES_PAGE_SIZE + index + 1
                const isBusy = processingId === msg._id

                return (
                  <TableRow key={msg._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium text-muted-foreground text-xs py-1'>
                      {globalIndex}
                    </TableCell>
                    <TableCell className='text-sm py-1'>
                      {new Date(msg.data_creare).toLocaleDateString('ro-RO')}
                    </TableCell>
                    <TableCell className='font-mono text-xs py-1'>
                      {msg.cui_emitent}
                    </TableCell>
                    <TableCell className='py-1'>
                      <div
                        className='text-sm font-medium truncate max-w-[300px]'
                        title={msg.titlu}
                      >
                        {msg.titlu}
                      </div>
                      {msg.processing_error && (
                        <div
                          className='text-xs text-red-600 mt-1 truncate max-w-[300px]'
                          title={msg.processing_error}
                        >
                          Eroare: {msg.processing_error}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='py-1'>
                      {getStatusBadge(msg.processing_status)}
                    </TableCell>
                    <TableCell className='py-1'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8'
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                              <RefreshCw className='h-4 w-4' />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => handleRetry(msg._id)}
                          >
                            Reîncearcă Procesarea
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handlePreview(msg._id)}
                          >
                            <Eye className='mr-2 h-4 w-4' /> Debug XML
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-4 border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isNavigating}
          >
            {isNavigating ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Anterior'
            )}
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {currentPage} din {data.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= data.totalPages || isNavigating}
          >
            {isNavigating ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Următor'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
