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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Package,
} from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { DeliveryPreview } from './DeliveryPreview'
import { useEffect, useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'

interface DeliveriesTableProps {
  deliveries: IDelivery[]
  currentYearCount: number
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
  currentYearCount,
}: DeliveriesTableProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const { currentPage, totalPages, totalCount } = pagination

  const [isPending, startTransition] = useTransition()
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

  const goToPage = (page: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', page.toString())
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== currentPage
    ) {
      goToPage(pageNum)
    } else {
      setJumpInputValue(currentPage.toString())
    }
  }

  return (
    <div className='flex flex-col flex-1 min-h-0 space-y-0 mt-2 w-full'>
      <div className='flex justify-end gap-4 text-sm text-muted-foreground shrink-0'>
        <div>
          Total livrări:
          <span className='font-medium ml-1'>{totalCount}</span>
        </div>
        <div>
          Total livrări efectuate ({new Date().getFullYear()}):
          <span className='font-medium ml-1'>{currentYearCount}</span>
        </div>
      </div>

      <div className='flex-1 overflow-x-auto border rounded-md bg-background'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted'>
              {/* EXACT LA FEL CA LA CLIENTI: h-8 py-1 */}
              <TableHead className='h-8 py-1 w-[120px]'>Status</TableHead>
              <TableHead className='h-8 py-1 w-[150px]'>Dată Creare</TableHead>
              <TableHead className='h-8 py-1'>Client</TableHead>
              <TableHead className='h-8 py-1'>Comandă</TableHead>
              <TableHead className='h-8 py-1'>Livrare</TableHead>
              <TableHead className='h-8 py-1'>Creata de</TableHead>
              <TableHead className='h-8 py-1 w-[100px] text-right'>
                Acțiuni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
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
                  <TableRow
                    key={delivery._id.toString()}
                    className='hover:bg-muted/50'
                  >
                    <TableCell className='py-1.5'>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.name}
                      </Badge>
                    </TableCell>
                    <TableCell className='py-1.5'>
                      {delivery.createdAt
                        ? format(new Date(delivery.createdAt), 'PPP', {
                            locale: ro,
                          })
                        : 'N/A'}
                    </TableCell>
                    <TableCell className='py-1.5'>
                      {delivery.clientSnapshot?.name}
                    </TableCell>
                    <TableCell className='py-1.5'>
                      {delivery.orderNumber}
                    </TableCell>
                    <TableCell className='py-1.5'>
                      {delivery.deliveryNumber}
                    </TableCell>
                    <TableCell className='py-1.5'>
                      {delivery.createdByName}
                    </TableCell>
                    <TableCell className='text-right py-1.5'>
                      <div className='flex justify-end gap-1 items-center'>
                        <DeliveryPreview delivery={delivery} />
                        <Button
                          asChild
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 hover:bg-muted'
                          title='Mergi la Comandă'
                        >
                          <Link href={`/orders/${delivery.orderId.toString()}`}>
                            <Package className='h-4 w-4 text-muted-foreground' />
                            <span className='sr-only'>Mergi la Comandă</span>
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-3 mt-auto border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>

          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
          >
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin mr-1' />
            ) : (
              <ChevronLeft className='h-4 w-4 mr-1' />
            )}
            Anterior
          </Button>

          <div className='flex items-center gap-2 text-sm text-muted-foreground mx-2'>
            <span>Pagina</span>
            <Input
              value={jumpInputValue}
              onChange={(e) => setJumpInputValue(e.target.value)}
              onBlur={handleJump}
              onKeyDown={(e) => e.key === 'Enter' && handleJump()}
              className='w-10 h-8 text-center px-1'
              disabled={isPending}
            />
            <span>din {totalPages}</span>
          </div>

          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
          >
            Următor
            {isPending ? (
              <Loader2 className='h-4 w-4 animate-spin ml-1' />
            ) : (
              <ChevronRight className='h-4 w-4 ml-1' />
            )}
          </Button>

          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages || isPending}
            title='Ultima pagină'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </div>
      )}
    </div>
  )
}
