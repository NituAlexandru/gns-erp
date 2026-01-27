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
import { Loader2 } from 'lucide-react'
import {
  AnafLogType,
  ANAF_LOG_TYPE_MAP,
  ANAF_ACTION_MAP,
} from '@/lib/db/modules/setting/efactura/anaf.constants'
import { PAYABLES_PAGE_SIZE } from '@/lib/constants'

interface LogItem {
  _id: string
  createdAt: string
  type: AnafLogType
  action: string
  message: string
}

interface AnafLogsTableProps {
  data: {
    data: LogItem[]
    totalPages: number
    total: number
  }
}

export function AnafLogsTable({ data }: AnafLogsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentPage = Number(searchParams.get('page')) || 1
  const [isPending, setIsPending] = useState(false)

  const handlePageChange = (newPage: number) => {
    setIsPending(true)
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
    setIsPending(false)
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='rounded-md border flex-1 overflow-auto min-h-0 relative'>
        <table className='w-full caption-bottom text-sm text-left'>
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
            {data.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='text-center h-24 text-muted-foreground py-1'
                >
                  Nu există loguri conform filtrelor.
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((log, index) => {
                const typeConfig = ANAF_LOG_TYPE_MAP[log.type] || {
                  label: log.type,
                  variant: 'secondary',
                }
                const actionLabel = ANAF_ACTION_MAP[log.action] || log.action
                const globalIndex =
                  (currentPage - 1) * PAYABLES_PAGE_SIZE + index + 1

                return (
                  <TableRow key={log._id} className='hover:bg-muted/50'>
                    <TableCell className='font-medium py-1 text-muted-foreground text-xs'>
                      {globalIndex}
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
        </table>
      </div>

      {/* Paginare */}
      {data.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-4 border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            {isPending ? (
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
            disabled={currentPage >= data.totalPages || isPending}
          >
            {isPending ? (
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
