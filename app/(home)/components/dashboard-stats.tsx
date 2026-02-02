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
      <CardContent className='pb-1'>
        <div className='grid grid-cols-5 gap-1 text-center divide-x'>
          {/* 1. CIORNE */}
          <Link
            href='/orders?status=DRAFT'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-gray-500'>
              {stats?.drafts || 0}
            </span>
            <span className='text-[9px] text-gray-500 uppercase font-semibold mt-1 leading-tight'>
              Ciorne
            </span>
          </Link>

          {/* 2. CONFIRMATE */}
          <Link
            href='/orders?status=CONFIRMED'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-red-600'>
              {stats?.confirmed || 0}
            </span>
            <span className='text-[9px] text-red-600 uppercase font-semibold mt-1 leading-tight'>
              Confirmate
            </span>
          </Link>

          {/* 3. PROGRAMATE */}
          <Link
            href='/orders?status=SCHEDULED'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-orange-500'>
              {stats?.scheduled || 0}
            </span>
            <span className='text-[9px] text-orange-500 uppercase font-semibold mt-1 leading-tight'>
              Programate
            </span>
          </Link>

          {/* 4. LIVRATE PARȚIAL */}
          <Link
            href='/orders?status=PARTIALLY_DELIVERED'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-yellow-500'>
              {stats?.partiallyDelivered || 0}
            </span>
            <span className='text-[9px] uppercase font-semibold mt-1 leading-tight text-yellow-500'>
              Livrate Parțial
            </span>
          </Link>

          {/* 5. LIVRATE INTEGRAL (Gata de factură) */}
          <Link
            href='/orders?status=DELIVERED'
            className='flex flex-col items-center px-1 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-green-600'>
              {stats?.delivered || 0}
            </span>
            <span className='text-[9px] uppercase text-green-600 font-semibold mt-1 leading-tight'>
              Livrate Integral
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
        {/* GRILĂ CU 4 COLOANE PENTRU TOATE STATUSURILE */}
        <div className='grid grid-cols-4 gap-2 text-center divide-x'>
          {/* 1. ÎN TRANZIT */}
          <Link
            href='/financial/delivery-notes?status=IN_TRANSIT'
            className='flex flex-col items-center px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-yellow-500'>
              {stats?.inTransit || 0}
            </span>
            <span className='text-[10px] text-yellow-500 uppercase font-semibold mt-1 leading-tight'>
              În Tranzit
            </span>
          </Link>

          {/* 2. DE FACTURAT (Status: DELIVERED) */}
          <Link
            href='/financial/delivery-notes?status=DELIVERED'
            className='flex flex-col items-center px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-green-600'>
              {stats?.delivered || 0}
            </span>
            <span className='text-[10px] uppercase text-green-600 font-semibold mt-1 leading-tight'>
              De Facturat
            </span>
          </Link>

          {/* 3. FACTURATE (Status: INVOICED) */}
          <Link
            href='/financial/delivery-notes?status=INVOICED'
            className='flex flex-col items-center px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-sky-400'>
              {stats?.invoiced || 0}
            </span>
            <span className='text-[10px] uppercase text-sky-400 font-semibold mt-1 leading-tight'>
              Facturate
            </span>
          </Link>

          {/* 4. ANULATE (Status: CANCELLED) */}
          <Link
            href='/financial/delivery-notes?status=CANCELLED'
            className='flex flex-col items-center px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer py-1'
          >
            <span className='text-2xl font-bold text-red-500'>
              {stats?.cancelled || 0}
            </span>
            <span className='text-[10px] uppercase text-red-500 font-semibold mt-1 leading-tight'>
              Anulate
            </span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
