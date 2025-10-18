'use client'

import { PopulatedOrder } from '@/lib/db/modules/order/types'
import { formatCurrency } from '@/lib/utils'
import { OrderStatusBadge } from './OrderStatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { DELIVERY_METHODS } from '@/lib/db/modules/order/constants'
import { useMemo } from 'react'

interface OrderDetailsViewProps {
  order: PopulatedOrder
}

export function OrderDetailsView({ order }: OrderDetailsViewProps) {
  // Găsim eticheta pentru metoda de livrare
  const deliveryMethodLabel =
    DELIVERY_METHODS.find((m) => m.key === order.deliveryType)?.label ||
    order.deliveryType

  // Refolosim logica de calcul din OrderTotals pentru a afișa defalcarea corectă
  const {
    productsSubtotal,
    servicesSubtotal,
    manualSubtotal,
    productsVat,
    servicesVat,
    manualVat,
  } = useMemo(() => {
    return order.lineItems.reduce(
      (acc, item) => {
        const itemSubtotal = item.priceAtTimeOfOrder * item.quantity
        const itemVatValue = item.vatRateDetails.value

        if (item.productId && !item.isManualEntry) {
          acc.productsSubtotal += itemSubtotal
          acc.productsVat += itemVatValue
        } else if (item.isManualEntry) {
          acc.manualSubtotal += itemSubtotal
          acc.manualVat += itemVatValue
        } else {
          acc.servicesSubtotal += itemSubtotal
          acc.servicesVat += itemVatValue
        }
        return acc
      },
      {
        productsSubtotal: 0,
        servicesSubtotal: 0,
        manualSubtotal: 0,
        productsVat: 0,
        servicesVat: 0,
        manualVat: 0,
      }
    )
  }, [order.lineItems])

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between sm:items-start gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>Comandă #{order.orderNumber}</h1>
          <p className='text-muted-foreground'>
            Creată la: {new Date(order.createdAt).toLocaleString('ro-RO')} de{' '}
            {order.salesAgent?.name || 'N/A'}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Card 1: Detalii Client, Livrare și Logistică */}
        <div className='lg:col-span-2 space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Detalii Client și Livrare</CardTitle>
            </CardHeader>
            <CardContent className='text-sm space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <h3 className='font-semibold mb-1'>Date Facturare</h3>
                  <p>{order.clientSnapshot.name}</p>
                  <p className='text-muted-foreground'>
                    CUI: {order.clientSnapshot.cui}
                  </p>
                  <p className='text-muted-foreground'>
                    Reg. Com: {order.clientSnapshot.regCom}
                  </p>
                  <p className='text-muted-foreground'>
                    {order.clientSnapshot.address}, {order.clientSnapshot.judet}
                  </p>
                </div>
                <div>
                  <h3 className='font-semibold mb-1'>Adresă de Livrare</h3>
                  <p>
                    {order.deliveryAddress.strada}, Nr.{' '}
                    {order.deliveryAddress.numar}
                    {order.deliveryAddress.localitate},{' '}
                    {order.deliveryAddress.judet},{' '}
                    {order.deliveryAddress.codPostal}
                  </p>
                  {order.deliveryAddress.alteDetalii && (
                    <p>{order.deliveryAddress.alteDetalii}</p>
                  )}
                </div>
                <div>
                  <h3 className='font-semibold mb-1'>Detalii Logistice</h3>
                  <p className='text-muted-foreground'>
                    Mod Livrare:{' '}
                    <span className='font-medium text-foreground'>
                      {deliveryMethodLabel}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Vehicul Estimat:{' '}
                    <span className='font-medium text-foreground'>
                      {order.estimatedVehicleType}
                    </span>
                  </p>
                </div>
                {order.delegate?.name && (
                  <div>
                    <h3 className='font-semibold mb-1'>Delegat</h3>
                    <p className='text-muted-foreground'>
                      {order.delegate.name}
                    </p>
                    <p className='text-muted-foreground'>
                      {order.delegate.idCardSeries}{' '}
                      {order.delegate.idCardNumber}
                    </p>
                    <p className='text-muted-foreground'>
                      {order.delegate.vehiclePlate}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 2: Sumar Financiar */}
        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle>Sumar Financiar</CardTitle>
          </CardHeader>
          <CardContent className='flex-grow flex flex-col text-sm'>
            <div className='flex-grow space-y-2'>
              <div className='flex justify-between font-medium'>
                <span>Subtotal Articole</span>
                <span>{formatCurrency(productsSubtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='pl-4 text-muted-foreground'>TVA Articole</span>
                <span className='font-medium text-muted-foreground'>
                  {formatCurrency(productsVat)}
                </span>
              </div>
              <div className='flex justify-between font-medium mt-2'>
                <span>Subtotal Servicii</span>
                <span>{formatCurrency(servicesSubtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='pl-4 text-muted-foreground'>TVA Servicii</span>
                <span className='font-medium text-muted-foreground'>
                  {formatCurrency(servicesVat)}
                </span>
              </div>
              <div className='flex justify-between font-medium mt-2'>
                <span>Subtotal Servicii Personalizate</span>
                <span>{formatCurrency(manualSubtotal)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='pl-4 text-muted-foreground'>
                  TVA Servicii Personalizate
                </span>
                <span className='font-medium text-muted-foreground'>
                  {formatCurrency(manualVat)}
                </span>
              </div>
            </div>
            <div className='mt-auto'>
              <Separator className='my-2' />
              <div className='flex justify-between text-md font-semibold'>
                <span>Subtotal General</span>
                <span>{formatCurrency(order.totals.subtotal)}</span>
              </div>
              <div className='flex justify-between text-md font-semibold'>
                <span>TVA General</span>
                <span>{formatCurrency(order.totals.vatTotal)}</span>
              </div>
              <div className='flex justify-between text-lg font-bold mt-2'>
                <span>Total General</span>
                <span>{formatCurrency(order.totals.grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Articole Comandă */}
        <div className='lg:col-span-3'>
          <Card>
            <CardHeader>
              <CardTitle>Articole Comandă</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produs/Serviciu</TableHead>
                    <TableHead className='text-right'>Cant.</TableHead>
                    <TableHead>U.M.</TableHead>
                    <TableHead className='text-right'>Preț Unitar</TableHead>
                    <TableHead className='text-right'>Valoare</TableHead>
                    <TableHead className='text-right'>Val. TVA</TableHead>
                    <TableHead className='text-right'>Total Linie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className='font-medium'>
                        {item.productName}
                      </TableCell>
                      <TableCell className='text-right'>
                        {item.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell>{item.unitOfMeasure}</TableCell>
                      <TableCell className='text-right'>
                        {formatCurrency(item.priceAtTimeOfOrder)}
                      </TableCell>

                        <TableCell className='text-right'>
                        {formatCurrency(item.lineValue)}
                      </TableCell>

                    
                      <TableCell className='text-right'>
                        {formatCurrency(item.lineVatValue)}
                      </TableCell>

                    
                      <TableCell className='text-right font-semibold'>
                        {formatCurrency(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
