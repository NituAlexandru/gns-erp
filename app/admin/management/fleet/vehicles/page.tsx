import { getAllVehicles } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'
import VehiclesList from './vehicles-list'

export default async function VehiclesPage() {
  // 1. Încărcăm datele pe server
  const vehicles = await getAllVehicles()

  // 2. Trimitem datele către componenta client care va afișa tabelul
  return <VehiclesList initialVehicles={vehicles} />
}
