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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AnafLogType,
  ANAF_LOG_TYPE_MAP,
  ANAF_ACTION_MAP,
} from '@/lib/db/modules/setting/efactura/anaf.constants'
import { getAnafLogs } from '@/lib/db/modules/setting/efactura/anaf.actions'
import { PAGE_SIZE } from '@/lib/constants'

interface LogItem {
  _id: string
  createdAt: string
  type: AnafLogType
  action: string
  message: string
}

interface AnafLogsTableProps {
  initialData: {
    data: LogItem[]
    totalPages: number
    total: number
  }
}

export function AnafLogsTable({ initialData }: AnafLogsTableProps) {
  const [logs, setLogs] = useState(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (page === 1) return
    startTransition(async () => {
      const result = await getAnafLogs(page, PAGE_SIZE)
      setLogs(result.data)
      setTotalPages(result.totalPages)
    })
  }, [page])

  return (
    <div className='flex flex-col h-full'>
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative'>
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-background shadow-sm'>
            <TableRow className='bg-muted/50'>
              <TableHead className='w-[50px]'>#</TableHead>
              <TableHead className='w-[180px]'>Data & Ora</TableHead>
              <TableHead className='w-[100px]'>Tip</TableHead>
              <TableHead className='w-[200px]'>Acțiune</TableHead>
              <TableHead>Mesaj</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-center h-24 text-muted-foreground'
                >
                  Nu există loguri înregistrate.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log, index) => {
                // Luăm configurarea pentru tipul de log (succes/eroare etc)
                const typeConfig = ANAF_LOG_TYPE_MAP[log.type] || {
                  label: log.type,
                  variant: 'secondary',
                }

                // Traducem acțiunea sau afișăm codul original dacă nu e în mapă
                const actionLabel = ANAF_ACTION_MAP[log.action] || log.action

                return (
                  <TableRow key={log._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium text-muted-foreground text-xs py-4'>
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleString('ro-RO')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeConfig.variant}>
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className='font-medium text-sm'>
                      {actionLabel}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {log.message}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
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
    </div>
  )
}
