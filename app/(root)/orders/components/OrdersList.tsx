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
import { cancelOrder } from '@/lib/db/modules/order/order.actions'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
  const [orders, setOrders] = useState<PopulatedOrder[]>(initialData.data)
  const [totalPages, setTotalPages] = useState(initialData.totalPages)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(currentPage)
  const [filters, setFilters] = useState<OrderFilters>({})
  const debouncedFilters = useDebounce(filters, 500)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<PopulatedOrder | null>(
    null
  )

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

  const handleCancel = async () => {
    if (!orderToCancel) return

    startTransition(async () => {
      const result = await cancelOrder(orderToCancel._id)
      if (result.success) {
        toast.success(result.message)
        setOrders((prevOrders) =>
          prevOrders.map((o) =>
            o._id === orderToCancel._id ? { ...o, status: 'CANCELLED' } : o
          )
        )
      } else {
        toast.error('Eroare la anulare', { description: result.message })
      }
      setIsConfirmOpen(false) // Închidem dialogul
      setOrderToCancel(null)
    })
  }

  const allowedDeliveryStatuses: PopulatedOrder['status'][] = [
    'CONFIRMED',
    'PARTIALLY_DELIVERED',
    'SCHEDULED',
  ]
  // Definim statusurile permise pentru modificare/anulare
  const editableStatuses: PopulatedOrder['status'][] = [
    'DRAFT',
    'CONFIRMED',
    'SCHEDULED',
    'PARTIALLY_DELIVERED',
  ]
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='sm'>
                          Acțiuni
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onSelect={() => router.push(`/orders/${order._id}`)}
                        >
                          Vizualizează
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(`/orders/${order._id}/edit`)
                          }
                          // Activăm doar dacă statusul permite editarea
                          disabled={!editableStatuses.includes(order.status)}
                        >
                          Modifică Comanda
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            router.push(`/deliveries/new?orderId=${order._id}`)
                          }
                          // Activăm doar dacă statusul permite planificarea
                          disabled={
                            !allowedDeliveryStatuses.includes(order.status)
                          }
                        >
                          Planifică Livrări
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-red-500'
                          onSelect={() => {
                            setOrderToCancel(order)
                            setIsConfirmOpen(true)
                          }}
                          disabled={
                            order.status === 'COMPLETED' ||
                            order.status === 'CANCELLED'
                          }
                        >
                          Anulează Comanda
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Anulare</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să anulezi comanda{' '}
              <strong>{orderToCancel?.orderNumber}</strong>? Dacă stocul a fost
              rezervat, acesta va fi eliberat. Acțiunea este ireversibilă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={isPending}>
              {isPending ? 'Se anulează...' : 'Da, anulează comanda'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
