'use client'

import { useState, useTransition } from 'react'
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
import { PopulatedOrder } from '@/lib/db/modules/order/types'
import { OrdersFilters } from './OrdersFilters'
import { OrderStatusBadge } from './OrderStatusBadge'
import { formatCurrency } from '@/lib/utils'
import {
  cancelOrder,
  checkOrderCancellationEligibility,
} from '@/lib/db/modules/order/order.actions'
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { OrderPreview } from './OrderPreview'

interface OrdersListProps {
  orders: PopulatedOrder[]
  totalPages: number
  currentPage: number
  isAdmin: boolean
}

export function OrdersList({
  orders,
  totalPages,
  currentPage,
  isAdmin,
}: OrdersListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<PopulatedOrder | null>(
    null,
  )
  const [cancellationWarning, setCancellationWarning] = useState<string | null>(
    null,
  )

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleCancel = async () => {
    if (!orderToCancel) return

    startTransition(async () => {
      const result = await cancelOrder(orderToCancel._id)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
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
          <OrdersFilters />
          <Button asChild>
            <Link href='/orders/new'>Comandă Nouă</Link>
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
                    <Link
                      href={`/orders/${order._id}`}
                      className='text-foreground decoration-transparent underline-offset-4 transition-colors hover:underline hover:decoration-primary hover:text-primary'
                    >
                      {order.orderNumber}
                    </Link>
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
                    <div className='flex items-center justify-end gap-0'>
                      <OrderPreview order={order} />
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
                            disabled={!editableStatuses.includes(order.status)}
                          >
                            Modifică Comanda
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              router.push(
                                `/deliveries/new?orderId=${order._id}`,
                              )
                            }
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
                              startTransition(async () => {
                                const check =
                                  await checkOrderCancellationEligibility(
                                    order._id,
                                  )

                                if (!check.allowed) {
                                  toast.error('Anulare imposibilă', {
                                    description: check.message,
                                  })
                                  return
                                }

                                setCancellationWarning(check.message) // Poate fi null sau textul cu "X livrări"
                                setOrderToCancel(order)
                                setIsConfirmOpen(true)
                              })
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
                    </div>
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
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Anulare</AlertDialogTitle>
            <AlertDialogDescription>
              {cancellationWarning ? (
                // Varianta cu Avertisment Livrări
                <span className='flex flex-col gap-2'>
                  <span>{cancellationWarning}</span>
                  <span className='text-red-600 font-semibold'>
                    Ești sigur că vrei să continui?
                  </span>
                </span>
              ) : (
                // Varianta Standard
                <span>
                  Ești sigur că vrei să anulezi comanda{' '}
                  <strong>{orderToCancel?.orderNumber}</strong>? Dacă stocul a
                  fost rezervat, acesta va fi eliberat. Acțiunea este
                  ireversibilă.
                </span>
              )}
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
