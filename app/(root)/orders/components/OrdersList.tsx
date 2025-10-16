'use client'

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { PopulatedOrder, OrderFilters } from '@/lib/db/modules/order/types'
import { OrdersFilters } from './OrdersFilters'
import { useDebounce } from '@/hooks/use-debounce'
import qs from 'query-string'
import { OrderStatusBadge } from './OrderStatusBadge'
import { formatCurrency } from '@/lib/utils'

interface OrdersListProps {
  initialData: {
    data: PopulatedOrder[]
    totalPages: number
  }
  currentPage: number
  isAdmin: boolean
}

export function OrdersList({
  initialData,
  currentPage,
  isAdmin,
}: OrdersListProps) {
  const [orders, setOrders] = useState<PopulatedOrder[]>(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(currentPage)
  const [filters, setFilters] = useState<OrderFilters>({})
  const debouncedFilters = useDebounce(filters, 500)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fetchOrders = () => {
        startTransition(async () => {
          const url = qs.stringifyUrl(
            {
              url: '/api/orders',
              query: { ...debouncedFilters, page },
            },
            { skipNull: true, skipEmptyString: true }
          )

          try {
            const res = await fetch(url)
            const result = await res.json()
            setOrders(result.data || [])
            setTotalPages(result.totalPages || 0)
          } catch (error) {
            console.error('Failed to fetch filtered orders:', error)
            setOrders([])
            setTotalPages(0)
          }
        })
      }
      fetchOrders()
    }
  }, [debouncedFilters, page])

  const handleFiltersChange = (newFilters: Partial<OrderFilters>) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  return (
    <div>
      <div className='flex items-center justify-between gap-4 mb-4'>
        <h1 className='text-2xl font-bold'>Comenzi</h1>

        <div className='flex items-center gap-2'>
          <OrdersFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isAdmin={true}
          />
          <Button asChild>
            <Link href='/orders/new'>Creare Comandă Nouă</Link>
          </Button>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              <TableHead>Nr. Comandă</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Agent Vânzări</TableHead>
              <TableHead>Dată Creare</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Total</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={7} className='text-center'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order._id} className='hover:bg-muted/50'>
                  <TableCell className='font-medium'>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{order.client?.name || 'N/A'}</TableCell>
                  <TableCell>{order.salesAgent?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className='text-right'>
                    {formatCurrency(order.totals.grandTotal)}
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button variant='ghost' size='sm'>
                      Detalii
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 9 : 7}
                  className='text-center h-24'
                >
                  Nicio comandă găsită.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            onClick={() => setPage((p: number) => p - 1)}
            disabled={page <= 1 || isPending}
          >
            Anterior
          </Button>
          <span className='text-sm'>
            Pagina {page} din {totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => setPage((p: number) => p + 1)}
            disabled={page >= totalPages || isPending}
          >
            Următor
          </Button>
        </div>
      )}
    </div>
  )
}
