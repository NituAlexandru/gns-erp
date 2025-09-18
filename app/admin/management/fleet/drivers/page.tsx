import { getAllDrivers } from '@/lib/db/modules/fleet/drivers/drivers.actions'
import DriversList from './drivers-list'

export default async function DriversPage() {
  const drivers = await getAllDrivers()
  return <DriversList initialDrivers={drivers} />
}
