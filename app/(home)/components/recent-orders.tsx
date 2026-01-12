'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { ORDER_STATUS_MAP } from '@/lib/db/modules/order/constants'
import { OrderStatusKey } from '@/lib/db/modules/order/types'
import { formatCurrency } from '@/lib/utils' // Presupun că ai acest utilitar, dacă nu, vezi funcția de jos
import { getRecentOrders } from '@/lib/db/modules/order/order.actions'

// Tipul datelor returnate de server action
type RecentOrder = {
  id: string
  orderNumber: string
  clientName: string
  amount: number
  date: Date
  status: string
}

export function RecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getRecentOrders()
        setOrders(data)
      } catch (err) {
        console.error('Failed to fetch orders', err)
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
            <ShoppingCart className='h-5 w-5' /> Comenzi Noi
          </CardTitle>
          <Button
            variant='ghost'
            size='sm'
            asChild
            className='text-xs text-muted-foreground'
          >
            <Link href='/orders'>
              Vezi toate <ArrowRight className='ml-1 h-3 w-3' />
            </Link>
          </Button>
        </div>
        <p className='text-xs text-muted-foreground'>
          Comenzi intrate în ultimele 24h lucrătoare
        </p>
      </CardHeader>

      <CardContent className='flex-1 overflow-auto pr-2'>
        <div className='space-y-4'>
          {loading ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              Se încarcă...
            </div>
          ) : orders.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              Nicio comandă nouă.
            </div>
          ) : (
            orders.map((item) => {
              // Preluăm configurația vizuală din ORDER_STATUS_MAP
              const statusConfig = ORDER_STATUS_MAP[
                item.status as OrderStatusKey
              ] || { name: item.status, variant: 'secondary' }

              return (
                <div
                  key={item.id}
                  className='flex items-center justify-between border-b pb-3 last:border-0 last:pb-0'
                >
                  <div>
                    <p className='font-medium text-sm'>{item.clientName}</p>
                    <p className='text-xs text-muted-foreground'>
                      {item.orderNumber} •{' '}
                      {new Date(item.date).toLocaleTimeString('ro-RO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className='text-right flex flex-col items-end gap-1'>
                    <p className='text-sm font-semibold'>
                      {/* Dacă nu ai formatCurrency importat, folosește: new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(item.amount) */}
                      {formatCurrency(item.amount)}
                    </p>
                    <Badge
                      variant={statusConfig.variant}
                      className='text-[10px] h-5 px-1.5'
                    >
                      {statusConfig.name}
                    </Badge>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
