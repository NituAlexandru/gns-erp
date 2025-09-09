import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStockByLocation } from '@/lib/db/modules/inventory/inventory.actions'
import {
  INVENTORY_LOCATIONS,
  LOCATION_NAMES_MAP,
} from '@/lib/db/modules/inventory/constants'
import { InventoryLocation } from '@/lib/db/modules/inventory/types'

export default async function StockByLocationPage({
  params,
}: {
  params: Promise<{ locationId: string }>
}) {
  const { locationId: locationIdFromUrl } = await params

  const isValidLocation = (INVENTORY_LOCATIONS as readonly string[]).includes(
    locationIdFromUrl
  )

  if (!isValidLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-destructive'>Locație Invalidă</CardTitle> 
        </CardHeader>
        <CardContent>
          <p>Locația {locationIdFromUrl} nu există în sistem.</p>
        </CardContent>
      </Card>
    )
  }

  const validLocationId = locationIdFromUrl as InventoryLocation
  const locationName = LOCATION_NAMES_MAP[validLocationId] || validLocationId
  const stockData = await getStockByLocation(validLocationId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stoc pentru locația: {locationName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cod Produs</TableHead>
              <TableHead>Nume Produs</TableHead>
              <TableHead className='text-right'>Cantitate</TableHead>
              <TableHead>Unitate de Măsură</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockData.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center'>
                  Nu există date despre stocuri pentru această locație.
                </TableCell>
              </TableRow>
            )}
            {stockData.map((item) => (
              <TableRow key={item._id}>
                <TableCell>{item.productCode || '-'}</TableCell>
                <TableCell className='font-medium'>{item.name}</TableCell>
                <TableCell className='text-right font-bold'>
                  {item.totalStock.toFixed(2)}
                </TableCell>
                <TableCell>{item.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
