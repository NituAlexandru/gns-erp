'use client'

import { useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ClientOrderItem } from '@/lib/db/modules/order/client-order.actions'
import { OrderStatusBadge } from '@/app/(root)/orders/components/OrderStatusBadge'

interface ClientOrdersListProps {
  clientId: string
  initialData: {
    data: ClientOrderItem[]
    totalPages: number
  }
  currentPage: number
}

export function ClientOrdersList({
  clientId,
  initialData,
  currentPage,
}: ClientOrdersListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const orders = initialData?.data || []
  const totalPages = initialData?.totalPages || 0

  const handleRowClick = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='border rounded-lg overflow-x-auto bg-card'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Nr. Comandă</TableHead>
              <TableHead>Data Creării</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Agent Vânzări</TableHead>
              <TableHead className='text-right'>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <TableRow
                  key={order._id.toString()}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleRowClick(order._id.toString())}
                >
                  <TableCell className='font-medium'>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    {order.salesAgentSnapshot?.name || 'N/A'}
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(order.totals.grandTotal)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Nicio comandă găsită.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {currentPage} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
