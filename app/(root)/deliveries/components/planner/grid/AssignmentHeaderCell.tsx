'use client'

import { IPopulatedAssignmentDoc } from '@/lib/db/modules/fleet/assignments/types'

interface AssignmentHeaderCellProps {
  assignment: IPopulatedAssignmentDoc
}

export function AssignmentHeaderCell({
  assignment,
}: AssignmentHeaderCellProps) {
  const driverName =
    assignment.driverId && typeof assignment.driverId === 'object'
      ? assignment.driverId.name
      : 'N/A'
  const vehicleNumber =
    assignment.vehicleId && typeof assignment.vehicleId === 'object'
      ? assignment.vehicleId.carNumber
      : 'N/A'

  return (
    <div className='p-1 border-r border-b border-border bg-muted/50 sticky top-0 z-10'>
      <p className='font-semibold text-sm truncate'>{assignment.name}</p>
      <p className='text-xs text-muted-foreground truncate'>{driverName}</p>
      <p className='text-xs text-muted-foreground truncate'>{vehicleNumber}</p>
    </div>
  )
}
