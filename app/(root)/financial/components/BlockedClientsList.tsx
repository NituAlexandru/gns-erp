'use client'

import { formatCurrency } from '@/lib/utils'
import { BlockedClientSummary } from '@/lib/db/modules/financial/dashboard/dashboard.types'
import { AlertTriangle, Ban, ShieldAlert } from 'lucide-react'
import { LOCKING_STATUS } from '@/lib/db/modules/client/summary/client-summary.constants'

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
        {data.map((client) => {
          const isManual = client.lockingStatus !== LOCKING_STATUS.AUTO

          // 1. Definim Textul Principal de Avertizare
          let warningText = 'Plafon Depasit'
          let warningValue = formatCurrency(client.excessAmount)

          if (client.excessAmount <= 0 && isManual) {
            // Dacă e blocat manual, dar nu există depășire, afișăm statusul
            warningText =
              client.lockingStatus === LOCKING_STATUS.MANUAL_BLOCK
                ? 'Blocat (Setat Manual)'
                : 'Activ (Setat Manual)'
            warningValue =
              client.excessAmount <= 0
                ? formatCurrency(0) // Afișează 0,00 RON dacă nu e depășire
                : warningValue
          }

          // Iconița pentru Blocare Manuală (pentru a fi mai vizibil)
          let displayIcon = <Ban className='w-4 h-4 text-red-600 shrink-0' />
          if (client.lockingStatus === LOCKING_STATUS.MANUAL_UNBLOCK) {
            displayIcon = (
              <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0' />
            )
          }

          return (
            <div
              key={client.id}
              className='border rounded-md p-1 flex items-center justify-between hover:bg-muted/20 transition-colors'
            >
              <div className='flex items-center gap-3 overflow-hidden'>
                {displayIcon}

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

              {/* Partea Dreaptă: Status Financiar Detaliat */}
              <div className='flex flex-col items-end '>
                {/* LINIA 1: Depășire Plafon (Textul Principal) */}
                <span
                  className={`font-bold text-sm whitespace-nowrap ${client.excessAmount > 0 || isManual ? 'text-red-600' : 'text-gray-500'}`}
                >
                  {warningText}: {warningValue}
                </span>

                {/* LINIA 2: Sold Total (Standard) */}
                <span className='text-[10px] text-muted-foreground'>
                  Sold Total: {formatCurrency(client.outstandingBalance)}
                </span>

                {/* LINIA 3: Motivul Manual (Apare doar dacă e setat manual) */}
                {isManual && (
                  <span
                    className='text-[10px] italic text-red-600 max-w-[150px] truncate'
                    title={client.lockingReason}
                  >
                    Motiv: {client.lockingReason || 'N/A'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
