'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, Wallet, Ban } from 'lucide-react'
import { BlockedClientsCard } from './blocked-clients-card'
import { ClientBalancesCard } from './client-balances-card'

export function RightPanel() {
  return (
    <div className='flex flex-col gap-4 h-full'>
      {/* Notificări */}
      <Card className='flex-grow shadow-sm border'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-lg flex items-center gap-2'>
            <Bell className='h-4 w-4' /> Notificări
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            Nu există notificări noi.
          </p>
        </CardContent>
      </Card>

      {/* 2. Solduri Clienți / Facturi Restante */}
      <ClientBalancesCard />

      {/* Clienți Blocați */}
      <BlockedClientsCard />
    </div>
  )
}
