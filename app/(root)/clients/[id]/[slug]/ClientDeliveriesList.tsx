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
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import {
  ClientDeliveryListItem,
  getDeliveriesForClient,
} from '@/lib/db/modules/deliveries/client-delivery.actions'
import { DeliveryStatusBadge } from '@/app/(root)/deliveries/components/DeliveryStatusBadge'

interface ClientDeliveriesListProps {
  clientId: string
}

export function ClientDeliveriesList({ clientId }: ClientDeliveriesListProps) {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<ClientDeliveryListItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchDeliveries = () => {
      startTransition(async () => {
        try {
          const result = await getDeliveriesForClient(clientId, page)
          setDeliveries(result.data || [])
          setTotalPages(result.totalPages || 0)
        } catch (error) {
          console.error('Failed to fetch client deliveries:', error)
          setDeliveries([])
          setTotalPages(0)
        }
      })
    }
    fetchDeliveries()
  }, [clientId, page])

  const handleRowClick = (deliveryId: string) => {
    router.push(`/deliveries/${deliveryId}`)
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
                      delivery.requestedDeliveryDate
                    ).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    {delivery.deliveryDate
                      ? new Date(delivery.deliveryDate).toLocaleDateString(
                          'ro-RO'
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
                  Nicio livrare găsită pentru acest client.
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
