import { getAllVehicles } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'
import VehiclesList from './vehicles-list'

export default async function VehiclesPage() {
 
  const vehicles = await getAllVehicles()

  return <VehiclesList initialVehicles={vehicles} />
}
