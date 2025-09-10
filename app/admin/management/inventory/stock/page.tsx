import { getAggregatedStockStatus } from '@/lib/db/modules/inventory/inventory.actions'
import { StockTable } from './stock-table'

export default async function StockStatusPage() {

  const initialStockData = await getAggregatedStockStatus()

  return <StockTable initialStockData={initialStockData} />
}
