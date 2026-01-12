'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ban, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getBlockedClientsCount } from '@/lib/db/modules/financial/dashboard/dashboard.actions'

export function BlockedClientsCard() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const data = await getBlockedClientsCount()
      setCount(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className='flex-grow shadow-sm border flex items-center justify-center min-h-[150px]'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </Card>
    )
  }

  const hasBlocked = count && count > 0

  return (
    <Card
      className={`flex-grow shadow-sm border ${hasBlocked ? 'border-l-4 border-l-red-600' : 'border-l-4 border-l-green-600'}`}
    >
      <CardHeader className='pb-2'>
        <CardTitle
          className={`text-lg flex items-center gap-2 ${hasBlocked ? 'text-red-600' : ''}`}
        >
          {hasBlocked ? (
            <Ban className='h-5 w-5' />
          ) : (
            <ShieldCheck className='h-5 w-5 text-green-600' />
          )}
          Clienți Blocați
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col items-center justify-center gap-4 pt-2'>
        <div className='text-center'>
          <span
            className={`text-4xl font-bold ${hasBlocked ? 'text-red-600' : 'text-muted-foreground'}`}
          >
            {count}
          </span>
          <p className='text-xs text-muted-foreground mt-1 uppercase font-semibold'>
            {hasBlocked ? 'Clienți cu livrare oprită' : 'Niciun client blocat'}
          </p>
        </div>

        <Button
          variant={hasBlocked ? 'destructive' : 'outline'}
          size='sm'
          className='w-full'
          asChild
        >
          <Link href='/financial'>
            Gestionează <ArrowRight className='ml-2 h-4 w-4' />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
