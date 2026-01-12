'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getOverdueInvoicesCount } from '@/lib/db/modules/client/summary/client-balances-stats.actions'

export function ClientBalancesCard() {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const data = await getOverdueInvoicesCount()
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

  const hasOverdue = count && count > 0

  return (
    <Card
      className={`flex-grow shadow-sm border ${hasOverdue ? 'border-l-4 border-l-red-600' : 'border-l-4 border-l-green-600'}`}
    >
      <CardHeader className='pb-2'>
        <CardTitle className='text-lg flex items-center gap-2'>
          <Wallet
            className={`h-5 w-5 ${hasOverdue ? 'text-red-600' : 'text-green-600'}`}
          />
          Facturi Restante
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col items-center justify-center gap-4 pt-2'>
        <div className='text-center'>
          <span
            className={`text-4xl font-bold ${hasOverdue ? 'text-red-600' : 'text-muted-foreground'}`}
          >
            {count}
          </span>
          <p className='text-xs text-muted-foreground mt-1 uppercase font-semibold'>
            {hasOverdue ? 'Facturi Restante' : 'Totul este la zi'}
          </p>
        </div>

        <Button variant='outline' size='sm' className='w-full' asChild>
          <Link href='/financial'>
            Vezi Detalii <ArrowRight className='ml-2 h-4 w-4' />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
