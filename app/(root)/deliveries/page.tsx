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
    assignedDeliveriesRaw,
    assignmentsRaw,
    trailersRaw,
  ] = await Promise.all([
    getUnassignedDeliveriesForDate(selectedDate),
    getAssignedDeliveriesForDate(selectedDate),
    getActiveAssignments(),
    TrailerModel.find().lean(),
  ])

  const unassignedDeliveries = sanitizeForClient(unassignedDeliveriesRaw)
  const assignedDeliveries = sanitizeForClient(assignedDeliveriesRaw)
  const assignments = sanitizeForClient(assignmentsRaw)
  const availableTrailers = sanitizeForClient(trailersRaw)

  return (
    <div className=' space-y-1'>
      <Suspense fallback={<div>Încărcare Planner...</div>}>
        <LogisticsPlannerClient
          initialSelectedDate={selectedDate}
          unassignedDeliveries={unassignedDeliveries as IDelivery[]}
          assignedDeliveries={assignedDeliveries as IDelivery[]}
          assignments={assignments as IPopulatedAssignmentDoc[]}
          availableTrailers={availableTrailers as ITrailerDoc[]}
        />
      </Suspense>
    </div>
  )
}
