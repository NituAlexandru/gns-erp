'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { ClientPaymentSummaryItem } from '@/lib/db/modules/financial/treasury/summary/summary.types'

interface ClientSummaryListProps {
  data: ClientPaymentSummaryItem[]
  isLoading: boolean
}

export function ClientSummaryList({ data, isLoading }: ClientSummaryListProps) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center h-40'>
        <p className='text-muted-foreground'>Se încarcă datele...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className='flex items-center justify-center h-40'>
        <p className='text-muted-foreground'>
          Nu există încasări de afișat pentru perioada selectată.
        </p>
      </div>
    )
  }

  return (
    <div className='max-h-[400px] overflow-y-auto'>
      <Table>
        <TableHeader className='sticky top-0 bg-background'>
          <TableRow>
            <TableHead>Nume Client</TableHead>
            <TableHead className='text-right'>Total Încasat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item._id.toString()}>
              <TableCell className='font-medium text-sm py-1'>
                {item.clientName}
              </TableCell>
              <TableCell className='text-right font-medium text-xs py-1'>
                {formatCurrency(item.totalIncasat)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
