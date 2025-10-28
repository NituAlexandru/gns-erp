'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ban, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { PlannedDelivery } from '@/lib/db/modules/deliveries/types'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { Badge } from '@/components/ui/badge'

interface PlannedDeliveriesListProps {
  plannedDeliveries: PlannedDelivery[]
  onRemoveDelivery: (tempId: string) => void
  onEditDelivery: (delivery: PlannedDelivery) => void
}

export function PlannedDeliveriesList({
  plannedDeliveries,
  onRemoveDelivery,
  onEditDelivery,
}: PlannedDeliveriesListProps) {
  const lockedStatuses: string[] = ['INVOICED', 'CANCELLED']

  return (
    <Card className='h-full sticky top-20'>
      <CardHeader>
        <CardTitle>Livrări Create ({plannedDeliveries.length})</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4 max-h-[70vh] overflow-y-auto'>
        {plannedDeliveries.length === 0 && (
          <p className='text-sm text-muted-foreground text-center p-4'>
            Nicio livrare planificată.
            <br />
            Selectează cantitățile din stânga și apasă Adaugă la Planificare.
          </p>
        )}
        {plannedDeliveries.map((delivery) => {
          const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
            name: 'Necunoscut',
            variant: 'secondary',
          }
          const canEdit = !lockedStatuses.includes(delivery.status)

          const canCancel = ['CREATED', 'SCHEDULED'].includes(delivery.status)

          return (
            <Card key={delivery.id} className='bg-muted/50 pt-2 pb-2'>
              <CardHeader className='p-4 pb-0 pt-0'>
                <div className='flex flex-row items-center justify-between m-0'>
                  <CardTitle className='text-xl font-semibold'>
                    Nr. {delivery.deliveryNumber}
                  </CardTitle>
                  <div className='flex items-center'>
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.name}
                    </Badge>

                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onEditDelivery(delivery)}
                      disabled={!canEdit}
                    >
                      <Pencil className='h-4 w-4' />
                    </Button>

                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => onRemoveDelivery(delivery.id)} // Funcția rămâne aceeași
                      disabled={!canCancel}
                      title='Anulează livrarea'
                    >
                      <Ban className='h-4 w-4 text-destructive' />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className='p-4 pt-0 text-sm space-y-1'>
                {/* Afișăm Data Solicitată */}
                <div>
                  <strong>Dată Solicitată: </strong>
                  {delivery.requestedDeliveryDate &&
                  !isNaN(new Date(delivery.requestedDeliveryDate).getTime())
                    ? format(delivery.requestedDeliveryDate, 'PPP', {
                        locale: ro,
                      })
                    : 'Dată invalidă'}
                  {/* Afișăm Intervalele Solicitate (ca listă separată prin virgulă) */}
                  {delivery.requestedDeliverySlots &&
                    delivery.requestedDeliverySlots.length > 0 && (
                      <>
                        <br /> <strong>Interval(e) Solicitat(e):</strong>{' '}
                        {delivery.requestedDeliverySlots.join(', ')}
                      </>
                    )}
                </div>

                {/* Afișăm Data/Intervalele Programate (dacă există) */}
                {delivery.deliveryDate && (
                  <div className='text-sm font-semibold text-green-600 border-l-2 border-green-600 pl-2'>
                    Programat:{' '}
                    {format(new Date(delivery.deliveryDate), 'PPP', {
                      locale: ro,
                    })}
                    {/* Afișăm Intervalele Programate (ca listă separată prin virgulă) */}
                    {delivery.deliverySlots &&
                      delivery.deliverySlots.length > 0 &&
                      ` (${delivery.deliverySlots.join(', ')})`}
                  </div>
                )}

                {/* Cod UIT */}
                {delivery.uitCode && (
                  <div className='text-xs'>
                    <strong>Cod UIT:</strong>
                    <span className='font-mono'>{delivery.uitCode}</span>
                  </div>
                )}
                {/* Note Livrare  */}
                {delivery.deliveryNotes && (
                  <div className='text-xs'>
                    <strong>Note Livrare:</strong> {delivery.deliveryNotes}
                  </div>
                )}
                {/* Lista Articole*/}
                <ol className='list-disc pl-5 text-muted-foreground'>
                  {' '}
                  {delivery.items.map((item) => (
                    <li key={item.id}>
                      {item.quantityToAllocate} {item.unitOfMeasure} {'-'}
                      {item.productName}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )
        })}
      </CardContent>
    </Card>
  )
}
