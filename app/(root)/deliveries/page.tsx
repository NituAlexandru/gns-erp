import { Suspense } from 'react'
import { LogisticsPlannerClient } from './components/LogisticsPlannerClient'
import {
  getUnassignedDeliveriesForDate,
  getAssignedDeliveriesForDate,
} from '@/lib/db/modules/deliveries/delivery.actions'
import { getActiveAssignments } from '@/lib/db/modules/fleet/assignments/assignments.actions'
import { parse, startOfDay } from 'date-fns'
import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'
import { IDelivery } from '@/lib/db/modules/deliveries/delivery.model'
import { sanitizeForClient } from '@/lib/utils'
import TrailerModel from '@/lib/db/modules/fleet/trailers/trailers.model'
import { ITrailerDoc } from '@/lib/db/modules/fleet/trailers/types'
import { getBlocksForDate } from '@/lib/db/modules/deliveries/availability/availability.actions'
import { IFleetAvailabilityDoc } from '@/lib/db/modules/deliveries/availability/availability.model'

interface PlannerPageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function LogisticsPlannerPage({
  searchParams,
}: PlannerPageProps) {
  const params = await searchParams
  const selectedDateStr = params.date

  const selectedDate = selectedDateStr
    ? parse(selectedDateStr, 'yyyy-MM-dd', new Date())
    : startOfDay(new Date())

  const [
    unassignedDeliveriesRaw,
    allAssignedDeliveriesRaw,
    assignmentsRaw,
    trailersRaw,
    timeBlocksRaw,
  ] = await Promise.all([
    getUnassignedDeliveriesForDate(selectedDate),
    getAssignedDeliveriesForDate(selectedDate),
    getActiveAssignments(),
    TrailerModel.find().lean(),
    getBlocksForDate(selectedDate),
  ])

  const unassignedDeliveries = sanitizeForClient(unassignedDeliveriesRaw)
  const allAssignedDeliveries = sanitizeForClient(
    allAssignedDeliveriesRaw
  ) as IDelivery[]
  const assignments = sanitizeForClient(assignmentsRaw)
  const availableTrailers = sanitizeForClient(trailersRaw)
  const timeBlocks = sanitizeForClient(timeBlocksRaw) as IFleetAvailabilityDoc[]

  const pickUpDeliveries = allAssignedDeliveries.filter(
    (d) => d.deliveryType === 'PICK_UP_SALE'
  )

  const thirdPartyDeliveries = allAssignedDeliveries.filter(
    (d) => d.isThirdPartyHauler === true && d.deliveryType !== 'PICK_UP_SALE'
  )

  const fleetDeliveries = allAssignedDeliveries.filter(
    (d) => d.deliveryType !== 'PICK_UP_SALE' && d.isThirdPartyHauler !== true
  )

  return (
    <div className='space-y-1'>
      <Suspense fallback={<div>Încărcare Planner...</div>}>
        <LogisticsPlannerClient
          initialSelectedDate={selectedDate}
          unassignedDeliveries={unassignedDeliveries as IDelivery[]}
          assignedDeliveries={fleetDeliveries}
          pickUpDeliveries={pickUpDeliveries}
          thirdPartyDeliveries={thirdPartyDeliveries}
          assignments={assignments as IPopulatedAssignmentDoc[]}
          availableTrailers={availableTrailers as ITrailerDoc[]}
          timeBlocks={timeBlocks}
        />
      </Suspense>
    </div>
  )
}
