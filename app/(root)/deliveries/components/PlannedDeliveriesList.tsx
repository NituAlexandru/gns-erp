'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { PlannedDelivery } from '@/lib/db/modules/deliveries/types'

interface PlannedDeliveriesListProps {
  plannedDeliveries: PlannedDelivery[]
  onRemoveDelivery: (tempId: string) => void
}

export function PlannedDeliveriesList({
  plannedDeliveries,
  onRemoveDelivery,
}: PlannedDeliveriesListProps) {
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

        {plannedDeliveries.map((delivery, index) => (
          <Card key={delivery.id} className='bg-muted/50'>
            <CardHeader className='p-4 pb-0 pt-0'>
              <div className='flex flex-row items-center justify-between m-0'>
                <CardTitle className='text-2xl font-semibold'>
                  Livrarea {index + 1}
                </CardTitle>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onRemoveDelivery(delivery.id)}
                >
                  <Trash2 className='h-4 w-4 text-destructive' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='p-4 pt-0 text-sm space-y-2'>
              <div>
                <strong>Dată Solicitată:</strong>
                {delivery.requestedDeliveryDate &&
                !isNaN(new Date(delivery.requestedDeliveryDate).getTime())
                  ? format(delivery.requestedDeliveryDate, 'PPP', {
                      locale: ro,
                    })
                  : 'Dată invalidă'}
                <br />
                <strong>Interval Solicitat:</strong>
                {delivery.requestedDeliverySlot}
              </div>

              {/* Afișează data/slotul REAL dacă există (setat de logistică) */}
              {delivery.deliveryDate && (
                <div className='text-sm font-semibold text-green-600 border-l-2 border-green-600 pl-2'>
                  Programat:{' '}
                  {format(new Date(delivery.deliveryDate), 'PPP', {
                    locale: ro,
                  })}
                  {delivery.deliverySlot && ` (${delivery.deliverySlot})`}     
                </div>
              )}
              {/* Cod UIT (dacă există) */}
              {delivery.uitCode && (
                <div className='text-xs'>
                  <strong>Cod UIT:</strong>{' '}
                  <span className='font-mono'>{delivery.uitCode}</span>
                </div>
              )}

              <ol className='list-disc pl-5 text-muted-foreground'>
                {delivery.items.map((item) => (
                  <li key={item.id}>
                    {item.quantityToAllocate} {item.unitOfMeasure} {'-'}{' '}
                    {item.productName}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}
