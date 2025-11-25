'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AnafLogType,
  ANAF_LOG_TYPE_MAP,
} from '@/lib/db/modules/setting/efactura/anaf.constants'

interface LogItem {
  _id: string
  createdAt: string
  type: AnafLogType
  action: string
  message: string
}

interface AnafLogsTableProps {
  logs: LogItem[]
}

export function AnafLogsTable({ logs }: AnafLogsTableProps) {
  const getVariant = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'success'
      case 'ERROR':
        return 'destructive'
      case 'WARNING':
        return 'warning' 
      default:
        return 'secondary'
    }
  }

  return (
    <div className='border rounded-lg overflow-hidden bg-card max-h-[600px] overflow-y-auto'>
      <Table>
        <TableHeader className='sticky top-0 bg-card z-10'>
          <TableRow className='bg-muted/50'>
            <TableHead className='w-[180px]'>Data & Ora</TableHead>
            <TableHead className='w-[100px]'>Tip</TableHead>
            <TableHead className='w-[150px]'>Acțiune</TableHead>
            <TableHead>Mesaj</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className='text-center h-24 text-muted-foreground'
              >
                Nu există loguri înregistrate.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell className='font-mono text-xs'>
                  {new Date(log.createdAt).toLocaleString('ro-RO')}
                </TableCell>
                <TableCell>
                  <Badge variant={getVariant(log.type)}>
                    {ANAF_LOG_TYPE_MAP[log.type] || log.type}
                  </Badge>
                </TableCell>
                <TableCell className='font-medium text-xs'>
                  {log.action}
                </TableCell>
                <TableCell className='text-sm'>{log.message}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
