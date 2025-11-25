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
import { Badge } from '@/components/ui/badge'
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { retryProcessMessage } from '@/lib/db/modules/setting/efactura/anaf.actions'
import {
  AnafProcessingStatus,
  ANAF_PROCESSING_STATUS_MAP,
} from '@/lib/db/modules/setting/efactura/anaf.constants'

// Definim tipul local pentru props, bazat pe ce returnează acțiunea
interface InboxMessage {
  _id: string
  data_creare: string
  cui_emitent: string
  titlu: string
  processing_status: AnafProcessingStatus
  processing_error?: string
}

interface AnafInboxTableProps {
  initialMessages: InboxMessage[]
}

export function AnafInboxTable({ initialMessages }: AnafInboxTableProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [isPending, startTransition] = useTransition()

  const handleRetry = (id: string) => {
    toast.loading('Se procesează...', { id: 'retry-toast' })

    startTransition(async () => {
      const result = await retryProcessMessage(id)

      if (result.success) {
        toast.success('Factura a fost importată cu succes!', {
          id: 'retry-toast',
        })
        // Scoatem mesajul din listă pentru că a fost procesat
        setMessages((prev) => prev.filter((m) => m._id !== id))
      } else {
        toast.error('Eroare la procesare', {
          id: 'retry-toast',
          description: result.error,
        })
      }
    })
  }

  return (
    <div className='border rounded-lg overflow-hidden bg-card'>
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/50'>
            <TableHead>Data</TableHead>
            <TableHead>CUI Emitent</TableHead>
            <TableHead>Titlu Mesaj</TableHead>
            <TableHead>Status Procesare</TableHead>
            <TableHead>Eroare / Detalii</TableHead>
            <TableHead className='text-right'>Acțiuni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className='text-center h-32 text-muted-foreground'
              >
                <div className='flex flex-col items-center justify-center gap-2'>
                  <CheckCircle2 className='h-8 w-8 text-green-600' />
                  <p>Toate mesajele au fost procesate cu succes.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            messages.map((msg) => {
              const statusInfo = ANAF_PROCESSING_STATUS_MAP[
                msg.processing_status
              ] || { label: msg.processing_status, variant: 'outline' }

              return (
                <TableRow key={msg._id} className='hover:bg-muted/50'>
                  <TableCell className='font-medium'>
                    {new Date(msg.data_creare).toLocaleDateString('ro-RO')}
                    <div className='text-xs text-muted-foreground'>
                      {new Date(msg.data_creare).toLocaleTimeString('ro-RO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </TableCell>
                  <TableCell>{msg.cui_emitent}</TableCell>
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
                        <span>{msg.processing_error}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
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
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
