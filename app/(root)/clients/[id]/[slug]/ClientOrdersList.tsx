'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import {
  ClientOrderItem,
  getOrdersForClient,
} from '@/lib/db/modules/order/client-order.actions'
import { OrderStatusBadge } from '@/app/(root)/orders/components/OrderStatusBadge'
import { Button } from '@/components/ui/button'

interface ClientOrdersListProps {
  clientId: string
}

export function ClientOrdersList({ clientId }: ClientOrdersListProps) {
  const router = useRouter()
  const [orders, setOrders] = useState<ClientOrderItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchOrders = () => {
      startTransition(async () => {
        try {
          const result = await getOrdersForClient(clientId, page)
          setOrders(result.data || [])
          setTotalPages(result.totalPages || 0)
        } catch (error) {
          console.error('Failed to fetch client orders:', error)
          setOrders([])
          setTotalPages(0)
        }
      })
    }
    fetchOrders()
  }, [clientId, page])

  const handleRowClick = (orderId: string) => {
    router.push(`/orders/${orderId}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
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
                  Nicio comandă găsită pentru acest client.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginare */}
      {totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-0'>
          <Button
            variant='outline'
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
