import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getAllOrders } from '@/lib/db/modules/order/order.actions'
import { OrderStatusBadge } from './components/OrderStatusBadge'
import { PopulatedOrder } from '@/lib/db/modules/order/types'

export default async function OrdersPage() {
  const orders = await getAllOrders()

  return (
    <div className='container mx-auto'>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold'>Comenzi</h1>

        <Button asChild>
          <Link href='/orders/new'>Comandă Nouă</Link>
        </Button>
      </div>

      <div className='border rounded-lg'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[150px]'>Număr Comandă</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className='w-[150px]'>Data</TableHead>
              <TableHead className='w-[120px]'>Status</TableHead>
              <TableHead className='text-right w-[150px]'>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order: PopulatedOrder) => (
                <TableRow key={order._id}>
                  <TableCell className='font-medium'>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{order.client?.name || 'Client șters'}</TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className='text-right'>
                    {order.totals.grandTotal.toFixed(2)} RON
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className='text-center h-24'>
                  Nu există comenzi de afișat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
