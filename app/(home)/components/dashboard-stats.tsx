'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClipboardList, Truck, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { getOrderStats, OrderStats } from '@/lib/db/modules/order/order.actions'
import {
  DeliveryNoteStats,
  getDeliveryNoteStats,
} from '@/lib/db/modules/financial/delivery-notes/delivery-note.actions'

// --- 1. CARD COMENZI ---
export function OrdersStatsCard() {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const data = await getOrderStats()
      setStats(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className='shadow-sm h-[140px] flex items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </Card>
    )
  }

  return (
    <Card className='shadow-sm border-l-4 border-l-red-500'>
      <CardHeader className='pb-1 pt-1'>
        <CardTitle className='text-lg font-bold flex items-center gap-2'>
          <ClipboardList className='h-5 w-5 text-red-500' />
          Situație Comenzi
        </CardTitle>
      </CardHeader>
      <CardContent className='pb-3'>
        {/* MODIFICAT: grid-cols-5 pentru a include noile statusuri */}
        <div className='grid grid-cols-5 gap-1 text-center divide-x'>
          {/* 1. CIORNE (NOU) */}
          <Link
            href='/orders' // Poți adăuga filtrare în URL dacă pagina suportă
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-gray-500'>
              {stats?.drafts || 0}
            </span>
            <span className='text-[9px] text-gray-500 uppercase font-semibold mt-1 leading-tight'>
              Ciorne
            </span>
          </Link>

          {/* 2. ÎNTÂRZIATE (NOU) - Le punem în față pentru vizibilitate */}
          <div className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'>
            <span className='text-2xl font-bold text-rose-700'>
              {stats?.overdue || 0}
            </span>
            <span className='text-[9px] text-rose-700 uppercase font-semibold mt-1 leading-tight'>
              Întârziate
            </span>
          </div>

          {/* 3. CONFIRMATE (De programat) */}
          <Link
            href='/orders'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-red-600'>
              {stats?.confirmed || 0}
            </span>
            <span className='text-[9px] text-red-600 uppercase font-semibold mt-1 leading-tight'>
              De Programat
            </span>
          </Link>

          {/* 4. ÎN LIVRARE */}
          <Link
            href='/orders'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-yellow-500'>
              {stats?.inProgress || 0}
            </span>
            <span className='text-[9px] uppercase font-semibold mt-1 leading-tight text-yellow-500'>
              În Livrare
            </span>
          </Link>

          {/* 5. DE FACTURAT */}
          <Link
            href='/orders'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-green-600'>
              {stats?.toInvoice || 0}
            </span>
            <span className='text-[9px] uppercase text-green-600 font-semibold mt-1 leading-tight'>
              De Facturat
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// --- 2. CARD AVIZE ---
export function DeliveryNotesStatsCard() {
  const [stats, setStats] = useState<DeliveryNoteStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const data = await getDeliveryNoteStats()
      setStats(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <Card className='shadow-sm h-[140px] flex items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </Card>
    )
  }

  return (
    <Card className='shadow-sm border-l-4 border-l-orange-500'>
      <CardHeader className='pb-1 pt-1'>
        <CardTitle className='text-lg font-bold flex items-center gap-2'>
          <Truck className='h-5 w-5 text-orange-500' />
          Situație Avize
        </CardTitle>
      </CardHeader>
      <CardContent className='pb-2'>
        {/* MODIFICAT: grid-cols-3 */}
        <div className='grid grid-cols-3 gap-2 text-center divide-x'>
          {/* 1. ÎNTÂRZIATE (NOU) */}
          <div className='flex flex-col items-center px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'>
            <span className='text-3xl font-bold text-rose-700'>
              {stats?.overdue || 0}
            </span>
            <span className='text-[10px] text-rose-700 uppercase font-semibold mt-1 leading-tight'>
              Întârziate
            </span>
          </div>

          {/* 2. În Tranzit */}
          <Link
            href='/financial/delivery-notes'
            className='flex flex-col items-center px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-3xl font-bold text-orange-500'>
              {stats?.inTransit}
            </span>
            <span className='text-[10px] text-orange-500 uppercase font-semibold mt-1 leading-tight'>
              În Tranzit
            </span>
          </Link>

          {/* 3. De Facturat */}
          <Link
            href='/financial/delivery-notes'
            className='flex flex-col items-center px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-3xl font-bold text-green-600'>
              {stats?.toInvoice}
            </span>
            <span className='text-[10px] uppercase text-green-600 font-semibold mt-1 leading-tight'>
              De Facturat
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
