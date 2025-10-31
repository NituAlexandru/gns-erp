'use client'

import { useEffect, useState } from 'react'
import { UnassignedDeliveryCard } from './planner/UnassignedDeliveryCard'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { ScheduleDeliveryModal } from './planner/ScheduleDeliveryModal'
import { DateHeader } from './planner/DateHeader'
import { AssignmentGrid } from './planner/AssignmentGrid'
import { ITrailerDoc } from '@/lib/db/modules/fleet/trailers/types'
import Ably, { Message } from 'ably' // Importăm clasa Ably
import { useRouter } from 'next/navigation'
import {
  ABLY_API_ENDPOINTS,
  ABLY_CHANNELS,
  ABLY_EVENTS,
} from '@/lib/db/modules/ably/constants'

interface LogisticsPlannerClientProps {
  initialSelectedDate: Date
  unassignedDeliveries: IDelivery[]
  assignedDeliveries: IDelivery[]
  assignments: IPopulatedAssignmentDoc[]
  availableTrailers: ITrailerDoc[]
}

export function LogisticsPlannerClient({
  initialSelectedDate,
  unassignedDeliveries,
  assignedDeliveries,
  assignments,
  availableTrailers,
}: LogisticsPlannerClientProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<IDelivery | null>(
    null
  )

  useEffect(() => {
    // Inițiem clientul Ably Realtime (pentru conexiune live)
    // Îi spunem să-și ia token-ul de la API-ul nostru securizat
    const ably = new Ably.Realtime({ authUrl: ABLY_API_ENDPOINTS.AUTH })
    // Ne conectăm la același canal pe care "anunță" backend-ul
    const channel = ably.channels.get(ABLY_CHANNELS.PLANNER)

    const onDataChanged = (message: Message) => {
      console.log('Ably: Data change received!', message.data)
      router.refresh()
    }

    // 2. Ne abonăm la eveniment folosind funcția
    channel.subscribe(ABLY_EVENTS.DATA_CHANGED, onDataChanged)

    // 3. Funcția de curățare
    return () => {
      // Ne dezabonăm de la eveniment folosind EXACT aceeași funcție
      channel.unsubscribe(ABLY_EVENTS.DATA_CHANGED, onDataChanged)
      ably.close()
    }
  }, [router])

  const handleOpenScheduleModal = (delivery: IDelivery) => {
    setSelectedDelivery(delivery)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedDelivery(null)
  }

  return (
    <div className='flex flex-col h-full gap-1'>
      {/* 1. Header-ul cu selecția datei */}
      <DateHeader selectedDate={initialSelectedDate} />

      {/* 2. Container principal (Stânga + Dreapta) */}
      <div className='flex flex-grow gap-4 min-h-[70vh]'>
        {/* Coloana Stânga: Livrări Neasignate (1/7) */}
        <div className='w-1/6 min-w-[250px] max-h-[83vh] thin-scrollbar bg-muted/50 rounded-lg p-2 overflow-y-auto'>
          <h2 className='text-lg font-semibold mb-2 p-2 sticky top-0 bg-muted z-10'>
            De Programat ({unassignedDeliveries.length})
          </h2>

          {unassignedDeliveries.length === 0 ? (
            <p className='text-sm text-muted-foreground p-2'>
              Nicio livrare solicitată pentru această dată.
            </p>
          ) : (
            <div className='space-y-2'>
              {unassignedDeliveries.map((delivery) => (
                <UnassignedDeliveryCard
                  key={delivery._id.toString()}
                  delivery={delivery}
                  onSchedule={handleOpenScheduleModal}
                />
              ))}
            </div>
          )}
        </div>
        {/* --- COLOANA DREAPTĂ --- */}
        <div className='w-5/6 flex-grow rounded-lg overflow-auto'>
          <AssignmentGrid
            assignments={assignments}
            assignedDeliveries={assignedDeliveries}
            onSchedule={handleOpenScheduleModal}
          />
        </div>
      </div>

      <ScheduleDeliveryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        delivery={selectedDelivery}
        assignments={assignments}
        assignedDeliveries={assignedDeliveries}
        availableTrailers={availableTrailers}
      />
    </div>
  )
}
