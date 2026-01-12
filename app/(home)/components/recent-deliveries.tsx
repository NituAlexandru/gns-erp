'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, Box } from 'lucide-react'
import Link from 'next/link'
import { DeliveryStatusKey } from '@/lib/db/modules/deliveries/types'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { getRecentDeliveries } from '@/lib/db/modules/deliveries/delivery.actions'

// Definim tipul datelor returnate de server action
type RecentDelivery = {
  id: string
  deliveryNumber: string
  clientName: string
  date: Date
  status: string
}

export function RecentDeliveries() {
  const [deliveries, setDeliveries] = useState<RecentDelivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getRecentDeliveries()
        setDeliveries(data)
      } catch (err) {
        console.error('Failed to fetch deliveries', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <Card className='h-full flex flex-col shadow-sm border'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-xl font-bold flex items-center gap-2'>
            <Box className='h-5 w-5' /> Livrări Recente
          </CardTitle>
          <Button
            variant='ghost'
            size='sm'
            asChild
            className='text-xs text-muted-foreground'
          >
            <Link href='/deliveries'>
              Vezi toate <ArrowRight className='ml-1 h-3 w-3' />
            </Link>
          </Button>
        </div>
        <p className='text-xs text-muted-foreground'>
          Livrări create în ultimele 24h lucrătoare
        </p>
      </CardHeader>

      <CardContent className='flex-1 overflow-auto pr-2'>
        <div className='space-y-4'>
          {loading ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              Se încarcă...
            </div>
          ) : deliveries.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              Nicio livrare recentă.
            </div>
          ) : (
            deliveries.map((item) => {
              // Obținem configurația vizuală pentru status
              const statusConfig = DELIVERY_STATUS_MAP[
                item.status as DeliveryStatusKey
              ] || { name: item.status, variant: 'secondary' }

              return (
                <div
                  key={item.id}
                  className='flex items-center justify-between border-b pb-3 last:border-0 last:pb-0'
                >
                  <div>
                    <p className='font-medium text-sm'>{item.clientName}</p>
                    <p className='text-xs text-muted-foreground'>
                      {item.deliveryNumber} •{' '}
                      {new Date(item.date).toLocaleTimeString('ro-RO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.name}
                  </Badge>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
