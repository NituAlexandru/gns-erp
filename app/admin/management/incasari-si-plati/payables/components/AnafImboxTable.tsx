'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  UserPlus,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  retryProcessMessage,
  previewAnafInvoice,
  getAnafInboxErrors,
} from '@/lib/db/modules/setting/efactura/anaf.actions'
import {
  AnafProcessingStatus,
  ANAF_PROCESSING_STATUS_MAP,
} from '@/lib/db/modules/setting/efactura/anaf.constants'
import { AnafPreviewModal } from './AnafPreviewModal'
import { ParsedAnafInvoice } from '@/lib/db/modules/setting/efactura/anaf.types'
import { PAGE_SIZE } from '@/lib/constants'

interface InboxMessage {
  _id: string
  data_creare: string
  cui_emitent: string
  titlu: string
  processing_status: AnafProcessingStatus
  processing_error?: string
}

interface AnafInboxTableProps {
  initialData: {
    data: InboxMessage[]
    totalPages: number
    total: number
  }
}

export function AnafInboxTable({ initialData }: AnafInboxTableProps) {
  const [messages, setMessages] = useState(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  // State pentru Preview
  const [previewData, setPreviewData] = useState<ParsedAnafInvoice | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)

  // Fetch la schimbarea paginii
  useEffect(() => {
    if (page === 1) return
    startTransition(async () => {
      const result = await getAnafInboxErrors(page, PAGE_SIZE)
      setMessages(result.data)
      setTotalPages(result.totalPages)
    })
  }, [page])

  // Handler Retry
  const handleRetry = (id: string) => {
    toast.loading('Se procesează...', { id: 'retry-toast' })
    startTransition(async () => {
      const result = await retryProcessMessage(id)
      if (result.success) {
        toast.success('Factura a fost importată cu succes!', {
          id: 'retry-toast',
        })
        // Reîmprospătăm lista local (sau am putea reface fetch-ul)
        setMessages((prev) => prev.filter((m) => m._id !== id))
      } else {
        toast.error('Eroare la procesare', {
          id: 'retry-toast',
          description: result.error,
        })
      }
    })
  }

  // Handler Preview
  const handlePreview = async (id: string) => {
    setLoadingPreviewId(id)
    try {
      const result = await previewAnafInvoice(id)
      if (result.success && result.data) {
        setPreviewData(result.data)
        setIsPreviewOpen(true)
      } else {
        toast.error(result.error || 'Nu s-a putut încărca previzualizarea.')
      }
    } catch {
      toast.error('Eroare conexiune.')
    } finally {
      setLoadingPreviewId(null)
    }
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Wrapper tabel cu scroll intern */}
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative'>
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
            <TableRow className='bg-muted/50 hover:bg-muted/50'>
              <TableHead className='w-[50px]'>#</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>CUI Emitent</TableHead>
              <TableHead>Titlu Mesaj</TableHead>
              <TableHead>Status Procesare</TableHead>
              <TableHead>Eroare / Detalii</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={6} className='h-24 text-center'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-center h-26 text-muted-foreground'
                >
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <CheckCircle2 className='h-8 w-8 text-green-500' />
                    <p>Toate mesajele au fost procesate cu succes.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              messages.map((msg, index) => {
                const statusInfo = ANAF_PROCESSING_STATUS_MAP[
                  msg.processing_status
                ] || { label: msg.processing_status, variant: 'outline' }

                return (
                  <TableRow key={msg._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium text-muted-foreground text-xs py-1'>
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell className='font-medium py-1'>
                      {new Date(msg.data_creare).toLocaleDateString('ro-RO')}
                      <div className='text-xs text-muted-foreground'>
                        {new Date(msg.data_creare).toLocaleTimeString('ro-RO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </TableCell>
                    <TableCell className='font-mono'>
                      {msg.cui_emitent}
                    </TableCell>
                    <TableCell
                      className='max-w-[250px] truncate'
                      title={msg.titlu}
                    >
                      {msg.titlu}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className='max-w-[300px] text-sm text-red-600'>
                      {msg.processing_error && (
                        <div className='flex items-start gap-1'>
                          <AlertCircle className='h-4 w-4 mt-0.5 shrink-0' />
                          <span
                            className='truncate'
                            title={msg.processing_error}
                          >
                            {msg.processing_error}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-right'>
                      <div className='flex justify-end gap-2 items-center'>
                        {/* BUTON ADĂUGARE FURNIZOR */}
                        {msg.processing_status === 'ERROR_NO_SUPPLIER' && (
                          <Button
                            size='sm'
                            variant='ghost'
                            className='text-red-600 hover:text-red-700 hover:bg-orange-50'
                            asChild
                            title='Adaugă Furnizor'
                          >
                            <Link href='/admin/management/suppliers/new'>
                              <UserPlus className='h-4 w-4' />
                            </Link>
                          </Button>
                        )}

                        {/* Buton Preview */}
                        <Button
                          size='sm'
                          variant='ghost'
                          title='Previzualizare'
                          disabled={loadingPreviewId === msg._id}
                          onClick={() => handlePreview(msg._id)}
                        >
                          {loadingPreviewId === msg._id ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <Eye className='h-4 w-4' />
                          )}
                        </Button>

                        {/* Buton Retry */}
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={isPending}
                          onClick={() => handleRetry(msg._id)}
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 mr-2 ${isPending ? 'animate-spin' : ''}`}
                          />
                          Reîncearcă
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {(totalPages > 1 || true) && (
        <div className='flex items-center justify-center gap-2 py-4 border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm text-muted-foreground'>
            Pagina {page} din {totalPages || 1}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}

      <AnafPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={previewData}
      />
    </div>
  )
}
