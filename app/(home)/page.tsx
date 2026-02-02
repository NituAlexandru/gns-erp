import {
  OrdersStatsCard,
  DeliveryNotesStatsCard,
} from './components/dashboard-stats'
import { RecentDeliveries } from './components/recent-deliveries'
import { RecentOrders } from './components/recent-orders'
import { RightPanel } from './components/right-panel'

export default function HomePage() {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-full'>
      {/* --- COLOANA 1: COMENZI --- */}
      <div className='flex flex-col gap-4 h-full min-h-0'>
        <div className='flex-none'>
          <OrdersStatsCard />
        </div>
        <div className='flex-1 min-h-0 overflow-hidden'>
          <RecentOrders />
        </div>
      </div>

      {/* --- COLOANA 2: LIVRĂRI (AVIZE) --- */}
      <div className='flex flex-col gap-4 h-full min-h-0'>
        <div className='flex-none'>
          <DeliveryNotesStatsCard />
        </div>
        <div className='flex-1 min-h-0 overflow-hidden'>
          <RecentDeliveries />
        </div>
      </div>

      {/* --- COLOANA 3: DREAPTA --- */}
      <div className='h-full min-h-0 overflow-hidden'>
        <RightPanel />
      </div>
    </div>
  )
}
