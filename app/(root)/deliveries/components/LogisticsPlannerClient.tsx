'use client'

import { useEffect, useState } from 'react'
import { UnassignedDeliveryCard } from './planner/UnassignedDeliveryCard'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { ScheduleDeliveryModal } from './planner/ScheduleDeliveryModal'
import { DateHeader } from './planner/DateHeader'
import { AssignmentGrid } from './planner/AssignmentGrid'
import { ITrailerDoc } from '@/lib/db/modules/fleet/trailers/types'
import Ably, { Message } from 'ably'
import { useRouter } from 'next/navigation'
import {
  ABLY_API_ENDPOINTS,
  ABLY_CHANNELS,
  ABLY_EVENTS,
} from '@/lib/db/modules/ably/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Truck } from 'lucide-react'
import { AssignedDeliveryCard } from './planner/grid/AssignedDeliveryCard'
import { IFleetAvailabilityDoc } from '@/lib/db/modules/deliveries/availability/availability.model'

interface LogisticsPlannerClientProps {
  initialSelectedDate: Date
  unassignedDeliveries: IDelivery[]
  assignedDeliveries: IDelivery[]
  pickUpDeliveries: IDelivery[]
  thirdPartyDeliveries: IDelivery[]
  assignments: IPopulatedAssignmentDoc[]
  availableTrailers: ITrailerDoc[]
  timeBlocks: IFleetAvailabilityDoc[]
}

export function LogisticsPlannerClient({
  initialSelectedDate,
  unassignedDeliveries,
  assignedDeliveries,
  pickUpDeliveries,
  thirdPartyDeliveries,
  assignments,
  availableTrailers,
  timeBlocks,
}: LogisticsPlannerClientProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<IDelivery | null>(
    null
  )

  useEffect(() => {
    const ably = new Ably.Realtime({ authUrl: ABLY_API_ENDPOINTS.AUTH })
    const channel = ably.channels.get(ABLY_CHANNELS.PLANNER)

    const onDataChanged = (message: Message) => {
      console.log('Ably: Data change received!', message.data)
      router.refresh()
    }

    channel.subscribe(ABLY_EVENTS.DATA_CHANGED, onDataChanged)

    return () => {
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
    <div className='flex flex-col h-full gap-2 pb-4'>
      {/* 1. Header-ul cu selecția datei */}
      <DateHeader selectedDate={initialSelectedDate} />

      {/* 2. Container principal (Stânga + Dreapta) */}
      <div className='flex flex-grow gap-4 min-h-[60vh]'>
        {/* Coloana Stânga: Livrări Neasignate (1/6) */}
        <div className='w-1/6 min-w-[250px] max-h-full thin-scrollbar bg-muted/50 rounded-lg p-2 overflow-y-auto border border-border'>
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

        {/* --- COLOANA DREAPTĂ: GRID-UL DE FLOTĂ --- */}
        <div className='w-5/6 flex-grow rounded-lg overflow-auto'>
          {/* Container pentru zonele speciale (Așezate pe orizontală) */}
          {(pickUpDeliveries.length > 0 || thirdPartyDeliveries.length > 0) && (
            <div className='flex gap-2 mb-2'>
              {/* ZONA 1: RIDICARE CLIENT (flex-1 pentru 50%) */}
              {pickUpDeliveries.length > 0 && (
                <Card className='flex-1 h-auto thin-scrollbar rounded-lg p-2 overflow-y-auto border border-border gap-2'>
                  <CardHeader className='p-0 sticky top-0 z-10'>
                    <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                      <Package className='h-4 w-4' /> Ridicare de către Client (
                      {pickUpDeliveries.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-0 flex flex-wrap gap-2'>
                    {pickUpDeliveries.map((delivery) => (
                      <div key={delivery._id.toString()} className='w-[175px]'>
                        <AssignedDeliveryCard
                          cardInfo={{
                            delivery: delivery,
                            startSlot: '00:00',
                            span: 1,
                          }}
                          onSchedule={handleOpenScheduleModal}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {thirdPartyDeliveries.length > 0 && (
                <Card className='flex-1 thin-scrollbar rounded-lg p-2 overflow-y-auto border border-border gap-2'>
                  <CardHeader className='p-0 sticky top-0 z-10'>
                    <CardTitle className='text-sm font-semibold flex items-center gap-2'>
                      <Truck className='h-4 w-4' /> Transportatori Terți /
                      Externi ({thirdPartyDeliveries.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='p-0 flex flex-wrap gap-2'>
                    {thirdPartyDeliveries.map((delivery) => (
                      <div key={delivery._id.toString()} className='w-[200px]'>
                        <AssignedDeliveryCard
                          cardInfo={{
                            delivery: delivery,
                            startSlot: '00:00',
                            span: 1,
                          }}
                          onSchedule={handleOpenScheduleModal}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <AssignmentGrid
            assignments={assignments}
            assignedDeliveries={assignedDeliveries}
            timeBlocks={timeBlocks}
            onSchedule={handleOpenScheduleModal}
            selectedDate={initialSelectedDate}
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
