'use client'

import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import { IPriceHistoryEntry } from '@/lib/db/modules/price-history/price-history.types'
import { useRef, useEffect } from 'react'
import {
  MOVEMENT_TYPE_DETAILS_MAP,
  StockMovementType,
} from '@/lib/db/modules/inventory/constants'
import { AvailableUnit } from '@/lib/db/modules/product/types'

interface PriceHistoryListProps {
  title: string
  data: IPriceHistoryEntry[]
  showPartner?: boolean
  availableUnits?: AvailableUnit[]
  alwaysOpen?: boolean
}

export default function PriceHistoryList({
  title,
  data,
  showPartner = true,
  availableUnits = [],
  alwaysOpen = false,
}: PriceHistoryListProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  // Filtrăm unitățile extra (fără baza, pe care o punem oricum prima)
  const extraUnits = availableUnits.filter((u) => u.type !== 'BASE')

  useEffect(() => {
    if (alwaysOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        detailsRef.current &&
        !detailsRef.current.contains(event.target as Node)
      ) {
        detailsRef.current.open = false
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [alwaysOpen])

  return (
    <details ref={detailsRef} className='relative m-0' open={alwaysOpen}>
      <summary
        className={`font-bold ${alwaysOpen ? 'cursor-default list-none' : 'cursor-pointer'}`}
      >
        {title}
        <span className='float-right text-[10px] font-normal text-muted-foreground'>
          {data?.length || 0} înregistrări
        </span>
      </summary>

      {/* Am mărit min-w pentru a face loc noilor coloane */}
      <div className='absolute z-20 mt-2 overflow-auto max-h-80 border rounded shadow-lg bg-background w-full '>
        <table className='w-full min-w-max text-xs text-left'>
          <thead className='bg-muted sticky top-0 z-30'>
            <tr>
              <th className='px-3 py-2'>Dată</th>
              {showPartner && <th className='px-3 py-2'>Partener</th>}
              <th className='px-3 py-2'>Tip</th>
              <th className='px-3 py-2'>Agent</th>

              {/* Coloana de Bază */}
              <th className='px-3 py-2 text-right border-l bg-muted/80'>
                Preț / {data?.[0]?.unitMeasure || 'Bază'}
              </th>

              {/* Coloane Dinamice pentru restul unităților */}
              {extraUnits.map((u) => (
                <th
                  key={u.name}
                  className='px-3 py-2 text-right border-l whitespace-nowrap'
                >
                  Preț / {u.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className='divide-y bg-background'>
            {data && data.length > 0 ? (
              data.map((item, i) => {
                const typeKey = item.transactionType as StockMovementType
                const friendlyName =
                  MOVEMENT_TYPE_DETAILS_MAP[typeKey]?.name ||
                  item.transactionType

                return (
                  <tr key={i} className='hover:bg-muted/50'>
                    <td className='px-3 py-2 whitespace-nowrap uppercase'>
                      {format(new Date(item.date), 'dd.MM.yyyy')}
                    </td>

                    {showPartner && (
                      <td
                        className='px-3 py-2 font-medium max-w-[150px] truncate'
                        title={item.partner.name}
                      >
                        {item.partner.name}
                      </td>
                    )}

                    <td className='px-3 py-2 text-muted-foreground uppercase text-[10px] font-semibold'>
                      {friendlyName}
                    </td>

                    <td className='px-3 py-2 text-muted-foreground whitespace-nowrap'>
                      {(item as any).createdBy?.name || '-'}
                    </td>

                    {/* Celulă Preț Bază */}
                    <td className='px-3 py-2 text-right font-bold border-l bg-muted/10'>
                      {formatCurrency(item.netPrice)}
                    </td>

                    {/* Celule Dinamice pentru Conversii */}
                    {extraUnits.map((u) => (
                      <td
                        key={u.name}
                        className='px-3 py-2 text-right border-l whitespace-nowrap'
                      >
                        {formatCurrency(item.netPrice * u.factor)}
                      </td>
                    ))}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={5 + extraUnits.length}
                  className='p-6 text-center text-muted-foreground italic bg-background'
                >
                  Nu există înregistrări în istoric.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </details>
  )
}
