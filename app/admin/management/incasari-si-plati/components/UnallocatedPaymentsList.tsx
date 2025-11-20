'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { UnallocatedPaymentItem } from '@/lib/db/modules/financial/treasury/summary/summary.types'

interface UnallocatedPaymentsListProps {
  data: UnallocatedPaymentItem[]
  isLoading: boolean
  onAllocateClick: (paymentId: string) => void
}

export function UnallocatedPaymentsList({
  data,
  isLoading,
  onAllocateClick,
}: UnallocatedPaymentsListProps) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-40 text-muted-foreground'>
        Se încarcă...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center h-40 text-muted-foreground text-center text-sm'>
        Excelent! Toate plățile din această perioadă sunt alocate.
      </div>
    )
  }

  return (
    <div className='max-h-[400px] overflow-y-auto'>
      <Table>
        <TableHeader className='sticky top-0 bg-background'>
          <TableRow>
            <TableHead>Client / Dată</TableHead>
            <TableHead className='text-right'>Nealocat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item._id}
              className='cursor-pointer hover:bg-muted/50'
              onClick={() => onAllocateClick(item._id)}
            >
              <TableCell className='py-1'>
                <div className='font-medium text-sm'>{item.clientName}</div>
                <div className='text-xs text-muted-foreground'>
                  {formatDateTime(new Date(item.paymentDate)).dateOnly} •{' '}
                  {item.seriesName} {item.paymentNumber}
                </div>
              </TableCell>

              <TableCell className='text-right font-bold text-red-600 py-2 text-xs'>
                {formatCurrency(item.unallocatedAmount)}
              </TableCell>

            
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
