'use client'

import { formatCurrency } from '@/lib/utils'
import { BlockedClientSummary } from '@/lib/db/modules/financial/dashboard/dashboard.types'
import { Ban, ShieldAlert } from 'lucide-react'

interface BlockedClientsListProps {
  data: BlockedClientSummary[]
}

export function BlockedClientsList({ data }: BlockedClientsListProps) {
  if (!data || data.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-4'>
        <ShieldAlert className='w-8 h-8 text-green-500' />
        <p className='text-xs'>Nu există clienți blocați la livrare.</p>
      </div>
    )
  }

  return (
    <div className='h-full overflow-y-auto pr-2'>
      <div className='space-y-1'>
        {data.map((client) => (
          <div
            key={client.id}
            // AICI E CHEIA SIMETRIEI: Aceleași clase de border și rounded ca la Acordeon
            className='border rounded-md p-1 flex items-center justify-between hover:bg-muted/20 transition-colors'
          >
            <div className='flex items-center gap-3 overflow-hidden'>
              <Ban className='w-4 h-4 text-red-600 shrink-0' />

              <div className='flex flex-col overflow-hidden'>
                <span
                  className='font-semibold text-sm truncate'
                  title={client.clientName}
                >
                  {client.clientName}
                </span>
                <span className='text-xs text-muted-foreground'>
                  Plafon Credit: {formatCurrency(client.creditLimit)}
                </span>
              </div>
            </div>

            {/* Partea Dreaptă: Depășirea (Badge Roșu) + Limita */}
            <div className='flex flex-col items-end '>
              <span className='font-bold text-sm text-red-600 whitespace-nowrap'>
                Plafon Depasit: {''} {formatCurrency(client.excessAmount)}
              </span>
              <span className='text-[10px] text-muted-foreground'>
                Sold Total: {formatCurrency(client.outstandingBalance)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
