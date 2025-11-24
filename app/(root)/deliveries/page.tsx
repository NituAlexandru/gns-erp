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
    allAssignedDeliveriesRaw, // Am redenumit variabila pentru claritate
    assignmentsRaw,
    trailersRaw,
  ] = await Promise.all([
    getUnassignedDeliveriesForDate(selectedDate),
    getAssignedDeliveriesForDate(selectedDate),
    getActiveAssignments(),
    TrailerModel.find().lean(),
  ])

  const unassignedDeliveries = sanitizeForClient(unassignedDeliveriesRaw)
  const allAssignedDeliveries = sanitizeForClient(
    allAssignedDeliveriesRaw
  ) as IDelivery[]
  const assignments = sanitizeForClient(assignmentsRaw)
  const availableTrailers = sanitizeForClient(trailersRaw)

  // --- FILTRARE LIVRĂRI SPECIALE (Server Side) ---
  const pickUpDeliveries = allAssignedDeliveries.filter(
    (d) => d.deliveryType === 'PICK_UP_SALE'
  )

  const thirdPartyDeliveries = allAssignedDeliveries.filter(
    (d) => d.isThirdPartyHauler === true && d.deliveryType !== 'PICK_UP_SALE'
  )

  // Livrările de flotă sunt restul (cele care au un assemblyId valid)
  // SAU cele care nu sunt nici PickUp nici Terț (pentru siguranță)
  const fleetDeliveries = allAssignedDeliveries.filter(
    (d) => d.deliveryType !== 'PICK_UP_SALE' && d.isThirdPartyHauler !== true
  )
  // -----------------------------------------------

  return (
    <div className='space-y-1'>
      <Suspense fallback={<div>Încărcare Planner...</div>}>
        <LogisticsPlannerClient
          initialSelectedDate={selectedDate}
          unassignedDeliveries={unassignedDeliveries as IDelivery[]}
          // Trimitem listele separate
          assignedDeliveries={fleetDeliveries} // Grid-ul primește doar Flota
          pickUpDeliveries={pickUpDeliveries} // Listă nouă
          thirdPartyDeliveries={thirdPartyDeliveries} // Listă nouă
          assignments={assignments as IPopulatedAssignmentDoc[]}
          availableTrailers={availableTrailers as ITrailerDoc[]}
        />
      </Suspense>
    </div>
  )
}
