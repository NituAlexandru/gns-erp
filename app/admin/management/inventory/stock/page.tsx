import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAggregatedStockStatus } from '@/lib/db/modules/inventory/inventory.actions'
import { AggregatedStockItem } from '@/lib/db/modules/inventory/types'

export default async function StockStatusPage() {
  const stockData = await getAggregatedStockStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stare Stocuri</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cod Produs</TableHead>
              <TableHead>Nume Produs</TableHead>
              <TableHead className='text-right'>Cantitate Totală</TableHead>
              <TableHead>Unitate de Măsură</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockData.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center'>
                  Nu există date despre stocuri.
                </TableCell>
              </TableRow>
            )}
            {stockData.map((item: AggregatedStockItem) => (
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
