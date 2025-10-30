'use client'

import { useMemo } from 'react'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { DELIVERY_SLOTS } from '@/lib/db/modules/deliveries/constants'
import { AssignmentGridRow } from './AssignmentGridRow' // <-- IMPORT NOU

type DeliverySlot = (typeof DELIVERY_SLOTS)[number]
type DisplaySlot = Exclude<DeliverySlot, '08:00 - 17:00'>

interface AssignmentGridProps {
  assignments: IPopulatedAssignmentDoc[]
  assignedDeliveries: IDelivery[]
  onSchedule: (delivery: IDelivery) => void
}

type DeliveryCardInfo = {
  delivery: IDelivery
  startSlot: string
  span: number
}

// Definim sloturile vizibile
const displaySlots: DisplaySlot[] = DELIVERY_SLOTS.filter(
  (slot): slot is DisplaySlot => slot !== '08:00 - 17:00'
)

// Funcție ajutătoare pentru a împărți un array în bucăți
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function AssignmentGrid({
  assignments,
  assignedDeliveries,
  onSchedule,
}: AssignmentGridProps) {
  // --- 1. Pregătirea Datelor (Map-ul global - neschimbat) ---
  const deliveryMap = useMemo(() => {
    const map = new Map<string, DeliveryCardInfo>()

    for (const delivery of assignedDeliveries) {
      if (
        !delivery.assemblyId ||
        !delivery.deliverySlots ||
        delivery.deliverySlots.length === 0
      ) {
        continue
      }

      const assemblyId = delivery.assemblyId.toString()
      const slots = delivery.deliverySlots
      const isAllDay = slots.includes('08:00 - 17:00')
      let span: number
      let startSlot: string

      if (isAllDay) {
        span = displaySlots.length
        startSlot = displaySlots[0]
      } else {
        span = slots.length
        startSlot = slots[0]
      }

      if (!displaySlots.includes(startSlot as DisplaySlot)) {
        continue
      }

      const key = `${assemblyId}-${startSlot}`
      map.set(key, { delivery, startSlot, span })
    }
    return map
  }, [assignedDeliveries])

  // --- 2. Logica de Împărțire (Chunking) ---
  const CHUNK_SIZE = 7 // Afișăm 7 ansambluri pe rând
  const assignmentChunks = useMemo(
    () => chunkArray(assignments, CHUNK_SIZE),
    [assignments]
  )

  // --- 3. Randarea ---
  return (
    // Container principal care ține rândurile de grid stivuite vertical
    <div className='space-y-4'>
      {assignmentChunks.map((chunk, index) => (
        <AssignmentGridRow
          key={`grid-row-${index}`}
          assignmentsForRow={chunk}
          displaySlots={displaySlots}
          deliveryMap={deliveryMap}
          onSchedule={onSchedule}
        />
      ))}
    </div>
  )
}
