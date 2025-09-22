import { getAllAssignments } from '@/lib/db/modules/fleet/assignments/assignments.actions'
import AssignmentsList from './assignments-list'

import '@/lib/db/modules/fleet/drivers/drivers.model'
import '@/lib/db/modules/fleet/vehicle/vehicle.model'
import '@/lib/db/modules/fleet/trailers/trailers.model'

export default async function AssignmentsPage() {
  const assignments = await getAllAssignments()
  return <AssignmentsList initialAssignments={assignments} />
}
