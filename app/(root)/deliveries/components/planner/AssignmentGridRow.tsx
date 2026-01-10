'use client'

import { Fragment, useState, useMemo } from 'react'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { DELIVERY_SLOTS } from '@/lib/db/modules/deliveries/constants'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AssignedDeliveryCard } from './grid/AssignedDeliveryCard'
import { TimeBlockCard } from './grid/TimeBlockCard'
import { BlockTimeModal } from './BlockTimeModal'
import { Plus } from 'lucide-react'
import { IFleetAvailabilityDoc } from '@/lib/db/modules/deliveries/availability/availability.model'
import { AssignmentHeaderCell } from './grid/AssignmentHeaderCell'

type DeliverySlot = (typeof DELIVERY_SLOTS)[number]
type DisplaySlot = Exclude<DeliverySlot, '08:00 - 17:00'>

// Tipuri Hărți
type DeliveryCardInfo = { delivery: IDelivery; startSlot: string; span: number }
type BlockCardInfo = { block: IFleetAvailabilityDoc; span: number }
type DeliveryMap = Map<string, DeliveryCardInfo>

interface AssignmentGridRowProps {
  assignmentsForRow: IPopulatedAssignmentDoc[]
  displaySlots: DisplaySlot[]
  deliveryMap: DeliveryMap
  timeBlocks: IFleetAvailabilityDoc[]
  onSchedule: (delivery: IDelivery) => void
  selectedDate: Date
}

export function AssignmentGridRow({
  assignmentsForRow,
  displaySlots,
  deliveryMap,
  timeBlocks,
  onSchedule,
  selectedDate,
}: AssignmentGridRowProps) {
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    assignmentId: string
    slot: string
  } | null>(null)

  const blockMap = useMemo(() => {
    const map = new Map<string, BlockCardInfo>()
    const blocks = timeBlocks || []

    blocks.forEach((block) => {
      const belongsToRow = assignmentsForRow.some(
        (a) => a._id === block.assignmentId.toString()
      )
      if (belongsToRow && block.slots && block.slots.length > 0) {
        const startSlot = block.slots[0]
        const span = block.slots.includes('08:00 - 17:00')
          ? displaySlots.length
          : block.slots.length
        const actualStartSlot = block.slots.includes('08:00 - 17:00')
          ? displaySlots[0]
          : startSlot
        const key = `${block.assignmentId.toString()}-${actualStartSlot}`
        map.set(key, { block, span })
      }
    })
    return map
  }, [timeBlocks, assignmentsForRow, displaySlots])

  const handleCellClick = (assignmentId: string, slot: string) => {
    setSelectedCell({ assignmentId, slot })
    setBlockModalOpen(true)
  }

  const gridColsClass = `grid-cols-[100px_repeat(${assignmentsForRow.length},_minmax(180px,_1fr))]`
  const gridRowsClass = `grid-rows-[auto_repeat(${displaySlots.length},_minmax(80px,_auto))]`

  return (
    <TooltipProvider>
      <div
        className={`grid ${gridColsClass} ${gridRowsClass} border-l border-t border-border`}
        style={{
          gridTemplateColumns: `100px repeat(${assignmentsForRow.length}, minmax(100px, 1fr))`,
          gridTemplateRows: `auto repeat(${displaySlots.length}, minmax(50px, auto))`,
        }}
      >
        {/* Header */}
        <div className='p-2 border-r border-b border-border bg-muted/50 sticky top-0 z-10'>
          <span className='font-semibold text-sm'>Orar</span>
        </div>
        {assignmentsForRow.map((asm) => (
          <AssignmentHeaderCell key={asm._id} assignment={asm} />
        ))}

        {/* Body */}
        {displaySlots.map((slot, slotIndex) => (
          <Fragment key={slot}>
            {/* Coloana Ora */}
            <div
              className='p-2 border-r border-b border-border bg-muted/30 text-xs font-medium sticky left-0'
              style={{ gridRow: slotIndex + 2 }}
            >
              {slot}
            </div>

            {assignmentsForRow.map((asm, asmIndex) => {
              const cellKey = `${asm._id}-${slot}`

              // A. Verificăm Livrări
              const deliveryInfo = deliveryMap.get(cellKey)
              if (deliveryInfo) {
                return (
                  <div
                    key={`del-${cellKey}`}
                    className='p-1 border-r border-b border-border relative z-10'
                    style={{
                      gridColumn: asmIndex + 2,
                      gridRow: `${slotIndex + 2} / span ${deliveryInfo.span}`,
                    }}
                  >
                    <AssignedDeliveryCard
                      cardInfo={{ ...deliveryInfo, startSlot: slot }}
                      onSchedule={onSchedule}
                    />
                  </div>
                )
              }

              // B. Verificăm Blocaje
              const blockInfo = blockMap.get(cellKey)
              if (blockInfo) {
                return (
                  <div
                    key={`blk-${cellKey}`}
                    className='p-1 border-r border-b border-border relative z-10'
                    style={{
                      gridColumn: asmIndex + 2,
                      gridRow: `${slotIndex + 2} / span ${blockInfo.span}`,
                    }}
                  >
                    <TimeBlockCard block={blockInfo.block} />
                  </div>
                )
              }

              // C. Verificăm dacă celula e "acoperită" (span) de altcineva de sus
              let isOccupied = false

              for (const [k, v] of deliveryMap.entries()) {
                const firstDashIndex = k.indexOf('-')
                const id = k.substring(0, firstDashIndex)
                const s = k.substring(firstDashIndex + 1)
                const idx = displaySlots.indexOf(s as DisplaySlot)
                // Dacă indexul e -1 (slot invalid), ignorăm
                if (idx === -1) continue
                if (
                  id === asm._id &&
                  slotIndex > idx &&
                  slotIndex < idx + v.span
                ) {
                  isOccupied = true
                  break
                }
              }
              if (!isOccupied) {
                for (const [k, v] of blockMap.entries()) {
                  const firstDashIndex = k.indexOf('-')
                  const id = k.substring(0, firstDashIndex)
                  const s = k.substring(firstDashIndex + 1)
                  const idx = displaySlots.indexOf(s as DisplaySlot)
                  if (idx === -1) continue
                  if (
                    id === asm._id &&
                    slotIndex > idx &&
                    slotIndex < idx + v.span
                  ) {
                    isOccupied = true
                    break
                  }
                }
              }

              if (isOccupied) return null

              // D. Celula Goală (Clickable)
              return (
                <div
                  key={`empty-${cellKey}`}
                  className='border-r border-b border-border hover:bg-muted/20 cursor-pointer group relative h-full'
                  style={{ gridColumn: asmIndex + 2, gridRow: slotIndex + 2 }}
                  onClick={() => handleCellClick(asm._id, slot)}
                >
                  <div className='absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Plus className='h-4 w-4 text-muted-foreground' />
                  </div>
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>

      {blockModalOpen && selectedCell && (
        <BlockTimeModal
          isOpen={blockModalOpen}
          onClose={() => setBlockModalOpen(false)}
          assignmentId={selectedCell.assignmentId}
          date={selectedDate}
          initialSlot={selectedCell.slot}
        />
      )}
    </TooltipProvider>
  )
}
