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
      {' '}
      <CardHeader>
        <CardTitle>Livrări Planificate ({plannedDeliveries.length})</CardTitle>
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
            <CardHeader className='flex-row items-center justify-between p-4'>
              <CardTitle className='text-base font-semibold'>
                Livrarea {index + 1}
              </CardTitle>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => onRemoveDelivery(delivery.id)}
              >
                <Trash2 className='h-4 w-4 text-destructive' />
              </Button>
            </CardHeader>
            <CardContent className='p-4 pt-0 text-sm space-y-2'>
              <div>
                <strong>Data:</strong>{' '}
                {format(delivery.deliveryDate, 'PPP', { locale: ro })}
                <br />
                <strong>Interval:</strong> {delivery.deliverySlot}
              </div>
              <ul className='list-disc pl-5 text-muted-foreground'>
                {delivery.items.map((item) => (
                  <li key={item.id}>
                    {item.productName} ({item.quantityToAllocate}{' '}
                    {item.unitOfMeasure})
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  )
}
