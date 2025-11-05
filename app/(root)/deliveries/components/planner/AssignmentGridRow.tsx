'use client'

import { Fragment } from 'react'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { DELIVERY_SLOTS } from '@/lib/db/modules/deliveries/constants'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AssignmentHeaderCell } from './grid/AssignmentHeaderCell'
import { AssignedDeliveryCard } from './grid/AssignedDeliveryCard'

type DeliverySlot = (typeof DELIVERY_SLOTS)[number]
type DisplaySlot = Exclude<DeliverySlot, '08:00 - 17:00'>
// Tipul pentru harta globală a livrărilor
type DeliveryMap = Map<string, DeliveryCardInfo>

// Tipul pentru un card individual
type DeliveryCardInfo = {
  delivery: IDelivery
  startSlot: string
  span: number
}

interface AssignmentGridRowProps {
  assignmentsForRow: IPopulatedAssignmentDoc[] // Doar ansamblurile pt acest rând
  displaySlots: DisplaySlot[] // Lista sloturilor vizibile
  deliveryMap: DeliveryMap // Harta globală cu TOATE livrările
  onSchedule: (delivery: IDelivery) => void
}

export function AssignmentGridRow({
  assignmentsForRow,
  displaySlots,
  deliveryMap,
  onSchedule,
}: AssignmentGridRowProps) {
  // --- Randarea Grid-ului (doar pentru acest rând) ---
  // Numărul total de coloane: 1 (pentru ore) + numărul de ansambluri din acest rând
  const gridColsClass = `grid-cols-[100px_repeat(${assignmentsForRow.length},_minmax(180px,_1fr))]`
  // Numărul total de rânduri: 1 (header) + numărul de sloturi VIZIBILE
  const gridRowsClass = `grid-rows-[auto_repeat(${displaySlots.length},_minmax(80px,_auto))]`

  return (
    <TooltipProvider>
      <div
        className={`grid ${gridColsClass} ${gridRowsClass} border-l border-t border-border`}
        // Stilurile sunt calculate pe baza assignmentsForRow.length
        style={{
          gridTemplateColumns: `100px repeat(${assignmentsForRow.length}, minmax(100px, 1fr))`,
          gridTemplateRows: `auto repeat(${displaySlots.length}, minmax(50px, auto))`,
        }}
      >
        {/* --- Rândul 1: Header (Ore + Ansamblurile din rând) --- */}

        {/* Celulă goală colț stânga-sus */}
        <div className='p-2 border-r border-b border-border bg-muted/50 sticky top-0 z-10'>
          <span className='font-semibold text-sm'>Orar</span>
        </div>

        {/* Header Ansambluri (Șoferi) - mapăm DOAR assignmentsForRow */}
        {assignmentsForRow.map((asm) => (
          <AssignmentHeaderCell key={asm._id} assignment={asm} />
        ))}

        {/* --- Rândurile 2+: Sloturi Orar și Celule de Livrare --- */}

        {displaySlots.map((slot, slotIndex) => (
          <Fragment key={slot}>
            {/* Celula 1: Ora */}
            <div
              key={slot} 
              className='p-2 border-r border-b border-border bg-muted/30 text-xs font-medium sticky left-0'
              style={{ gridRow: slotIndex + 2 }}
            >
              {slot}
            </div>

            {/* Celulele de conținut (Livrările) - mapăm DOAR assignmentsForRow */}
            {assignmentsForRow.map((asm, asmIndex) => {
              const key = `${asm._id}-${slot}`
              const cardInfo = deliveryMap.get(key)

              // Dacă există un card care ÎNCEPE în această celulă
              if (cardInfo) {
                const { span } = cardInfo

                return (
                  <div
                    key={key}
                    className='p-1 border-r border-b border-border relative'
                    style={{
                      gridColumn: asmIndex + 2, // +2 pt coloana de ore
                      gridRow: `${slotIndex + 2} / span ${span}`, // Întindere
                    }}
                  >
                    <AssignedDeliveryCard
                      cardInfo={cardInfo}
                      onSchedule={onSchedule}
                    />
                  </div>
                )
              }

              // Verificăm dacă această celulă este DEJA OCUPATĂ
              let isOccupied = false
              for (const [mapKey, { span }] of deliveryMap.entries()) {
                const [mapAsmId, mapStartSlot] = mapKey.split('-')
                const mapSlotIndex = displaySlots.indexOf(
                  mapStartSlot as DisplaySlot
                )
                if (mapSlotIndex === -1) continue

                if (
                  mapAsmId === asm._id &&
                  slotIndex > mapSlotIndex &&
                  slotIndex < mapSlotIndex + span
                ) {
                  isOccupied = true
                  break
                }
              }

              // Dacă e ocupat, nu randăm nimic
              if (isOccupied) {
                return null
              }

              // Dacă e goală
              return (
                <div
                  key={key}
                  className='border-r border-b border-border'
                  style={{
                    gridColumn: asmIndex + 2,
                    gridRow: slotIndex + 2,
                  }}
                >
                  {/* Celulă goală */}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </TooltipProvider>
  )
}
