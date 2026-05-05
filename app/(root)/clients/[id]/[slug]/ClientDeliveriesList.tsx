'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { ClientDeliveryListItem } from '@/lib/db/modules/deliveries/client-delivery.actions'
import { DeliveryStatusBadge } from '@/app/(root)/deliveries/components/DeliveryStatusBadge'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ClientDeliveriesListProps {
  clientId: string
  initialData: {
    data: ClientDeliveryListItem[]
    totalPages: number
    totalSum?: number
  }
  currentPage: number
}

export function ClientDeliveriesList({
  clientId,
  initialData,
  currentPage,
}: ClientDeliveriesListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const deliveries = initialData?.data || []
  const totalPages = initialData?.totalPages || 0
  const totalSum = initialData?.totalSum || 0
  const [jumpInputValue, setJumpInputValue] = useState(currentPage.toString())

  useEffect(() => {
    setJumpInputValue(currentPage.toString())
  }, [currentPage])

  const handleJump = () => {
    const pageNum = parseInt(jumpInputValue, 10)
    if (
      !isNaN(pageNum) &&
      pageNum >= 1 &&
      pageNum <= totalPages &&
      pageNum !== currentPage
    ) {
      handlePageChange(pageNum)
    } else {
      setJumpInputValue(currentPage.toString())
    }
  }
  const handleRowClick = (deliveryId: string) => {
    router.push(`/orders/${deliveryId}`)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className='flex flex-col gap-4 flex-1 min-h-[calc(100vh-30rem)] w-full'>
      <div className='flex-1 border rounded-lg overflow-x-auto bg-card '>
        <div className='flex gap-2 items-center justify-between px-2'>
          <span className='text-sm font-bold text-muted-foreground uppercase'>
            Total Sume Livrari:
          </span>
          <span className='text-xl font-bold text-primary'>
            {formatCurrency(totalSum)}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Nr. Livrare</TableHead>
              <TableHead>Dată Programată</TableHead>
              <TableHead>Dată Livrare</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Șofer / Vehicul</TableHead>
              <TableHead className='text-right'>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={6} className='text-center h-24'>
                  Se încarcă...
                </TableCell>
              </TableRow>
            ) : deliveries.length > 0 ? (
              deliveries.map((delivery) => (
                <TableRow
                  key={delivery._id.toString()}
                  className='cursor-pointer hover:bg-muted/50'
                  onClick={() => handleRowClick(delivery._id.toString())}
                >
                  <TableCell className='font-medium'>
                    {delivery.deliveryNumber}
                  </TableCell>
                  <TableCell>
                    {new Date(
                      delivery.requestedDeliveryDate,
                    ).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    {delivery.deliveryDate
                      ? new Date(delivery.deliveryDate).toLocaleDateString(
                          'ro-RO',
                        )
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <DeliveryStatusBadge status={delivery.status} />
                  </TableCell>
                  <TableCell>
                    {delivery.driverName || 'N/A'}
                    {delivery.vehicleNumber && ` / ${delivery.vehicleNumber} `}
                  </TableCell>
                  <TableCell className='text-right font-semibold'>
                    {formatCurrency(delivery.totals.grandTotal)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className='text-center h-24'>
                  Nicio livrare găsită.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Paginare identică cu Orders */}
      {totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 py-1 mt-auto border-t bg-background shrink-0'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => handlePageChange(1)}
            disabled={currentPage <= 1 || isPending}
            title='Prima pagină'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='h-8'
            onClick={() => handlePageChange(currentPage - 1)}
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
            onClick={() => handlePageChange(currentPage + 1)}
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
            onClick={() => handlePageChange(totalPages)}
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
