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
import { ISupplierOrderDoc } from '@/lib/db/modules/supplier-orders/supplier-order.types'
import { SupplierOrderStatusBadge } from './SupplierOrderStatusBadge'
import { formatCurrency, cn, formUrlQuery } from '@/lib/utils'
import {
  cancelSupplierOrder,
  confirmSupplierOrderAction,
  deleteSupplierOrder,
} from '@/lib/db/modules/supplier-orders/supplier-order.actions'
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
import { useRouter, useSearchParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'

// Import funcțiile de stilizare
import {
  getProgressColor,
  getTextColor,
  SUPPLIER_ORDER_STATUS_DETAILS,
} from '@/lib/db/modules/supplier-orders/supplier-order.constants'
import { PAGE_SIZE } from '@/lib/constants'
import { MoreHorizontal } from 'lucide-react'

interface SupplierOrdersListProps {
  initialData: {
    success: boolean
    data: ISupplierOrderDoc[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage?: number
    }
  }
  currentPage: number
}

export function SupplierOrdersList({
  initialData,
  currentPage,
}: SupplierOrdersListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [orderToInteract, setOrderToInteract] =
    useState<ISupplierOrderDoc | null>(null)
  const [actionType, setActionType] = useState<'CANCEL' | 'DELETE' | 'CONFIRM'>(
    'CANCEL'
  )
  const orders = initialData.data || []
  const totalPages = initialData.pagination?.totalPages || 1
  const itemsPerPage = initialData.pagination?.itemsPerPage || PAGE_SIZE

  const handlePageChange = (newPage: number) => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: 'page',
      value: newPage.toString(),
    })

    startTransition(() => {
      router.push(newUrl, { scroll: false })
    })
  }

  const getDeliveryProgress = (order: ISupplierOrderDoc) => {
    // 1. Dacă e marcată completă manual, e 100%
    if (order.status === 'COMPLETED') return 100

    let totalMerchandiseValue = 0 // Valoarea totală a MĂRFII (fără transport)
    let totalReceivedValue = 0 // Valoarea efectiv recepționată

    // 2. Iterăm prin PRODUSE
    if (order.products) {
      for (const item of order.products) {
        if (item.quantityOrdered && item.quantityOrdered > 0) {
          const lineTotal = item.lineTotal || 0

          // Adăugăm la totalul mărfii
          totalMerchandiseValue += lineTotal

          // Calculăm cât s-a primit valoric
          const ratio = Math.min(
            (item.quantityReceived || 0) / item.quantityOrdered,
            1
          )
          totalReceivedValue += ratio * lineTotal
        }
      }
    }

    // 3. Iterăm prin AMBALAJE
    if (order.packagingItems) {
      for (const item of order.packagingItems) {
        if (item.quantityOrdered && item.quantityOrdered > 0) {
          const lineTotal = item.lineTotal || 0

          // Adăugăm la totalul mărfii
          totalMerchandiseValue += lineTotal

          // Calculăm cât s-a primit valoric
          const ratio = Math.min(
            (item.quantityReceived || 0) / item.quantityOrdered,
            1
          )
          totalReceivedValue += ratio * lineTotal
        }
      }
    }

    // 4. Calculăm procentul raportat DOAR la marfă
    if (totalMerchandiseValue === 0) return 0

    const percentage = (totalReceivedValue / totalMerchandiseValue) * 100

    return Math.min(Math.round(percentage), 100)
  }

  const handleAction = async () => {
    if (!orderToInteract) return

    startTransition(async () => {
      let result

      if (actionType === 'DELETE') {
        result = await deleteSupplierOrder(orderToInteract._id)
      } else if (actionType === 'CONFIRM') {
        result = await confirmSupplierOrderAction(orderToInteract._id)
      } else {
        result = await cancelSupplierOrder(orderToInteract._id)
      }

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error('Eroare', { description: result.message })
      }
      setIsConfirmOpen(false)
      setOrderToInteract(null)
    })
  }

  const editableStatuses: string[] = [
    'DRAFT',
    'CONFIRMED',
    'SENT',
    'PARTIALLY_DELIVERED',
  ]

  return (
    <div className='w-full'>
      <div className='rounded-none border-none  overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow className='border-b  hover:bg-transparent'>
              <TableHead className='w-[50px] text-muted-foreground'>
                #
              </TableHead>
              <TableHead>Nr. Comandă</TableHead>
              <TableHead>Dată Comandă</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Creat De</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='w-[140px]'>Receptionat</TableHead>
              <TableHead className='text-right'>Total</TableHead>
              <TableHead className='text-right'>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center h-24 '>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : orders.length > 0 ? (
              orders.map((order, index) => {
                const progress = getDeliveryProgress(order)
                const progressBarClass = getProgressColor(progress)
                const progressTextClass = getTextColor(progress)
                const rowNumber = (currentPage - 1) * itemsPerPage + index + 1

                return (
                  <TableRow key={order._id} className='border-b '>
                    <TableCell className='py-1 text-muted-foreground font-medium'>
                      {rowNumber}
                    </TableCell>
                    <TableCell className=' py-1'>
                      {order.orderNumber}
                      {order.supplierOrderNumber && (
                        <span className='block text-xs text-muted-foreground'>
                          Ref.: {order.supplierOrderNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='py-1 '>
                      <div className='flex flex-col gap-0'>
                        <span>
                          {new Date(order.orderDate).toLocaleDateString(
                            'ro-RO'
                          )}
                        </span>
                        {order.supplierOrderDate && (
                          <span className='text-xs text-muted-foreground'>
                            Ref:{' '}
                            {new Date(
                              order.supplierOrderDate
                            ).toLocaleDateString('ro-RO')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className=' py-1 '>
                      {order.supplierSnapshot?.name || 'N/A'}
                    </TableCell>
                    <TableCell className='py-1 '>
                      {order.createdByName}
                    </TableCell>
                    <TableCell className='py-1'>
                      <SupplierOrderStatusBadge status={order.status} />
                    </TableCell>

                    {/* Celula de progres cu clasele aplicate corect */}
                    <TableCell className='py-1'>
                      <div className='flex items-center gap-2'>
                        <Progress
                          value={progress}
                          className={cn(
                            'h-2 w-16 min-w-[200px] ',
                            progressBarClass
                          )}
                        />
                        <span
                          className={cn(
                            'text-xs w-8 text-right font-extrabold',
                            progressTextClass
                          )}
                        >
                          {progress}%
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className='text-right py-1 font-bold'>
                      {formatCurrency(order.grandTotal)}
                    </TableCell>

                    <TableCell className='text-right py-1'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 text-right'
                          >
                            <MoreHorizontal className='mr-2 h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            className='cursor-pointer'
                            onClick={() =>
                              router.push(
                                `/admin/management/supplier-orders/${order._id}`
                              )
                            }
                          >
                            Vizualizează
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className='cursor-pointer'
                            disabled={!editableStatuses.includes(order.status)}
                            onClick={() =>
                              router.push(
                                `/admin/management/supplier-orders/${order._id}/edit`
                              )
                            }
                          >
                            Modifică
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {order.status === 'DRAFT' ? (
                            <>
                              <DropdownMenuItem
                                className='text-green-500 cursor-pointer focus:text-green-600'
                                onSelect={() => {
                                  setOrderToInteract(order)
                                  setActionType('CONFIRM')
                                  setIsConfirmOpen(true)
                                }}
                              >
                                Confirmă Comanda
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className='text-red-500 cursor-pointer'
                                onSelect={() => {
                                  setOrderToInteract(order)
                                  setActionType('DELETE')
                                  setIsConfirmOpen(true)
                                }}
                              >
                                Șterge
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              className='text-orange-500 cursor-pointer'
                              disabled={['COMPLETED', 'CANCELLED'].includes(
                                order.status
                              )}
                              onSelect={() => {
                                setOrderToInteract(order)
                                setActionType('CANCEL')
                                setIsConfirmOpen(true)
                              }}
                            >
                              Anulează
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className='text-center h-24 '>
                  Nicio comandă găsită.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginarea afișată condiționat, așa cum a fost cerut */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-4 py-6 mt-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            className='h-9 px-4'
          >
            Anterior
          </Button>
          <span className='text-sm  '>
            Pagina <span>{currentPage}</span> din <span>{totalPages || 1}</span>
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            className='    h-9 px-4'
          >
            Următor
          </Button>
        </div>
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {/* --- MODIFICARE TITLU --- */}
              {actionType === 'DELETE'
                ? 'Ștergere Comandă'
                : actionType === 'CONFIRM'
                  ? 'Confirmare Comandă'
                  : 'Anulare Comandă'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'CONFIRM'
                ? `Ești sigur că vrei să confirmi această comandă? Statusul se va schimba în "${SUPPLIER_ORDER_STATUS_DETAILS['CONFIRMED'].label}".`
                : 'Ești sigur că vrei să continui? Această acțiune este ireversibilă.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='min-w-[100px]'>Nu</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={
                actionType === 'DELETE'
                  ? 'bg-red-600 hover:bg-red-500 min-w-[100px]'
                  : actionType === 'CONFIRM'
                    ? 'bg-red-600 hover:bg-red-500 min-w-[100px]'
                    : ''
              }
            >
              Da
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
