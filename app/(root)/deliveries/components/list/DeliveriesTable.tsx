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
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

interface DeliveriesTableProps {
  deliveries: IDelivery[]
  pagination: {
    totalCount: number
    currentPage: number
    totalPages: number
    pageSize: number
  }
}

export function DeliveriesTable({
  deliveries,
  pagination,
}: DeliveriesTableProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const { currentPage, totalPages, totalCount } = pagination

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className='space-y-3'>
      <div className='flex justify-end text-sm text-muted-foreground'>
        Total livrări: <span className='font-medium ml-1'>{totalCount}</span>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[120px]'>Status</TableHead>
              <TableHead className='w-[150px]'>Dată Creare</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Comandă</TableHead>
              <TableHead>Livrare</TableHead>
              <TableHead className='w-[100px] text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-muted-foreground'
                >
                  Niciun rezultat găsit.
                </TableCell>
              </TableRow>
            ) : (
              deliveries.map((delivery) => {
                const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
                  name: delivery.status,
                  variant: 'secondary',
                }
                return (
                  <TableRow key={delivery._id.toString()}>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {delivery.createdAt
                        ? format(new Date(delivery.createdAt), 'PPP', {
                            locale: ro,
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{delivery.clientSnapshot?.name}</TableCell>
                    <TableCell>{delivery.orderNumber}</TableCell>
                    <TableCell>{delivery.deliveryNumber}</TableCell>
                    <TableCell className='text-right'>
                      <Button asChild variant='ghost' size='icon'>
                        <Link href={`/orders/${delivery.orderId.toString()}`}>
                          <Eye className='h-4 w-4' />
                          <span className='sr-only'>Vezi Detalii</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-3'>
          <Button
            variant='outline'
            size='sm'
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            ← Înapoi
          </Button>

          <span className='text-sm text-muted-foreground'>
            Pagina {currentPage} din {totalPages}
          </span>

          <Button
            variant='outline'
            size='sm'
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
          >
            Înainte →
          </Button>
        </div>
      )}
    </div>
  )
}
