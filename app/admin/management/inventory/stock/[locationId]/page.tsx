import { getStockByLocation } from '@/lib/db/modules/inventory/inventory.actions'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import { InventoryLocation } from '@/lib/db/modules/inventory/types'
import { StockByLocationTable } from './stock-by-location-table'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default async function StockByLocationPage({
  params,
}: {
  params: Promise<{ locationId: string }>
}) {
  const { locationId } = await params

  const isValidLocation = (INVENTORY_LOCATIONS as readonly string[]).includes(
    locationId
  )

  if (!isValidLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-destructive'>Locație Invalidă</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Locația {locationId} nu există în sistem.</p>
        </CardContent>
      </Card>
    )
  }

  const validLocationId = locationId as InventoryLocation
  const locationName = LOCATION_NAMES_MAP[validLocationId] || validLocationId
  const response = await getStockByLocation(validLocationId, '', 1)
  const initialStockData = response.data

  return (
    <StockByLocationTable
      initialStockData={initialStockData}
      locationId={validLocationId}
      locationName={locationName}
    />
  )
}
