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
import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Download, Pencil, Truck } from 'lucide-react'
import { useMemo } from 'react' // Păstrăm useMemo
import { formatMinutes } from '@/lib/db/modules/client/client.utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import Link from 'next/link'

interface OrderDetailsViewProps {
  order: PopulatedOrder
  deliveries: IDelivery[]
}

export function OrderDetailsView({ order, deliveries }: OrderDetailsViewProps) {
  const deliveryMethodLabel =
    DELIVERY_METHODS.find((m) => m.key === order.deliveryType)?.label ||
    order.deliveryType

  // --- Blocul useMemo pentru defalcarea totalurilor ---
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
        const itemSubtotal = item.lineValue
        const itemVatValue = item.lineVatValue

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
      {/* 1. Header Pagina  */}
      <div className='flex flex-col sm:flex-row justify-between sm:items-start gap-4'>
        <div>
          <h1 className='text-2xl font-bold'>Comandă #{order.orderNumber}</h1>
          <p className='text-muted-foreground'>
            Creată la: {new Date(order.createdAt).toLocaleString('ro-RO')} de{' '}
            {order.salesAgent?.name || 'N/A'}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' asChild title='Editează Comanda'>
            <Link href={`/orders/${order._id}/edit`}>
              Modifică Comanda <Pencil className='h-3 w-3' />
            </Link>
          </Button>

          {/* Buton Planificare Livrări */}
          <Button variant='outline' asChild title='Planifică Livrări'>
            <Link href={`/deliveries/new?orderId=${order._id}`}>
              Modifică Livrarile <Truck />
            </Link>
          </Button>
          <Button variant='outline'>
            Proforma <Download />
          </Button>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Coloana Stângă (Detalii) */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Card Detalii Client și Livrare */}
          <Card>
            <CardHeader>
              <CardTitle>Detalii Client și Livrare</CardTitle>
            </CardHeader>
            <CardContent className='text-sm space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {/* Date Facturare */}
                <div>
                  <h3 className='font-semibold mb-1'>Date Facturare</h3>
                  <p className='font-medium '>{order.clientSnapshot.name}</p>
                  <p className='text-muted-foreground'>
                    CUI:{' '}
                    <span className='font-medium text-foreground'>
                      {' '}
                      {order.clientSnapshot.cui}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Reg. Com:{' '}
                    <span className='font-medium text-foreground'>
                      {' '}
                      {order.clientSnapshot.regCom}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Adresa:{' '}
                    <span className='font-medium text-foreground'>
                      {order.clientSnapshot.address},{' '}
                      {order.clientSnapshot.judet}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Bancă:{' '}
                    <span className='font-medium text-foreground'>
                      {' '}
                      {order.clientSnapshot.bank}
                    </span>{' '}
                  </p>
                  <p className='text-muted-foreground'>
                    IBAN:{' '}
                    <span className='font-medium text-foreground'>
                      {order.clientSnapshot.iban}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Agent Vanzare:{' '}
                    <span className='font-medium text-foreground'>
                      {order.salesAgentSnapshot.name}
                    </span>
                  </p>
                </div>

                {/* Detalii Logistice */}
                <div>
                  <h3 className='font-semibold mb-1'>Detalii Logistice</h3>
                  {/* Adresă Livrare */}
                  <p className='text-muted-foreground'>
                    Adresă de Livrare:{' '}
                    <span className='font-medium text-foreground'>
                      Str. {order.deliveryAddress.strada}, Nr.{' '}
                      {order.deliveryAddress.numar},{' '}
                      {order.deliveryAddress.localitate},{' '}
                      {order.deliveryAddress.judet},{' '}
                      {order.deliveryAddress.codPostal}
                    </span>
                    {order.deliveryAddress.alteDetalii && (
                      <p className='text-xs italic text-muted-foreground'>
                        {order.deliveryAddress.alteDetalii}.
                      </p>
                    )}
                  </p>
                  <p className='text-muted-foreground'>
                    Mod Livrare:{' '}
                    <span className='font-medium text-foreground'>
                      {deliveryMethodLabel}
                    </span>
                  </p>
                  <p className='text-muted-foreground'>
                    Tip Vehicul Ales:{' '}
                    <span className='font-medium text-foreground'>
                      {order.estimatedVehicleType}
                    </span>
                  </p>
                  <div className='flex gap-2'>
                    <p className='text-muted-foreground'>
                      Distanță:{' '}
                      <span className='font-medium text-foreground'>
                        {order.distanceInKm} km
                      </span>
                    </p>
                    <p className='text-muted-foreground'>
                      Timp Traseu:{' '}
                      <span className='font-medium text-foreground'>
                        {formatMinutes(order.travelTimeInMinutes)}
                      </span>
                    </p>
                  </div>

                  <p className='text-muted-foreground'>
                    Cost Transport Recomandat:{' '}
                    <span className='font-medium text-foreground'>
                      {formatCurrency(order.recommendedShippingCost || 0)}
                    </span>
                  </p>
                </div>
                <div>
                  {/* Card Note Comandă */}
                  {order.notes && (
                    <div>
                      <p>Mentiuni: </p>
                      <span className='font-medium text-foreground'>
                        {order.notes}{' '}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coloana Dreaptă (Totaluri) */}
        <Card className='flex flex-col'>
          <CardHeader>
            <CardTitle>Sumar Financiar</CardTitle>
          </CardHeader>
          <CardContent className='flex-grow flex flex-col text-sm'>
            <div className='flex-grow'>
              {/* Afișăm totalurile calculate din useMemo */}
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

              <>
                <div className='flex justify-between font-medium mt-2'>
                  <span>Subtotal Manual</span>
                  <span>{formatCurrency(manualSubtotal)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='pl-4 text-muted-foreground'>TVA Manual</span>
                  <span className='font-medium text-muted-foreground'>
                    {formatCurrency(manualVat)}
                  </span>
                </div>
              </>
            </div>
            <div className='mt-auto'>
              <Separator className='my-2' />
              {/* Afișăm totalurile finale din order.totals */}
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

        {/* Card 3: Articole Comandă (Neschimbat) */}
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
                    <TableHead className='text-right'>
                      Cant. Comandată
                    </TableHead>
                    <TableHead className='text-right'>Cant. Livrată</TableHead>
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
                      <TableCell className='text-right font-bold text-blue-500'>
                        {(item.quantityShipped || 0).toFixed(2)}
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

        {/* Card 4: Livrări Planificate */}
        {deliveries && deliveries.length > 0 && (
          <div className='lg:col-span-3'>
            <Card>
              <CardHeader>
                <CardTitle>Livrări Planificate ({deliveries.length})</CardTitle>
              </CardHeader>
              <CardContent className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {deliveries.map((delivery) => {
                  const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
                    name: 'Necunoscut',
                    variant: 'secondary',
                  }

                  return (
                    <Card
                      key={delivery._id.toString()}
                      className='bg-muted/50 flex flex-col'
                    >
                      <CardHeader className='p-4 pb-2'>
                        {/* Am folosit flexbox pentru aliniere */}
                        <div className='flex flex-row items-center justify-between gap-2'>
                          {/* Titlu cu numărul livrării */}
                          <CardTitle className='text-base font-semibold flex items-center gap-1 flex-wrap'>
                            <h3 className='font-mono text-xs sm:text-sm whitespace-nowrap'>
                              Livrarea Nr. {delivery.deliveryNumber}
                            </h3>
                          </CardTitle>
                          {/* Container dreapta pt badge și buton aviz */}
                          <div className='flex items-center gap-1 flex-shrink-0'>
                            {/* Badge-ul de status (adăugat) */}
                            <Badge
                              variant={statusInfo.variant}
                              className='text-xs'
                            >
                              {statusInfo.name}
                            </Badge>

                            {/* Buton Aviz (ajustat stil) */}
                            <Button size='sm' variant='outline'>
                              <Download className='h-3 w-3 sm:mr-1' />
                              <span className='hidden sm:inline'>Aviz</span>
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {/* CardContent rămâne la fel */}
                      <CardContent className='p-4 pt-0 text-sm space-y-3 flex-grow flex flex-col'>
                        <div className='flex-grow space-y-3'>
                          {delivery.deliveryDate ? (
                            // CAZ 1: Există dată programată de logistică
                            <div className='text-green-600 font-semibold border-l-2 border-green-600 pl-2'>
                              <strong>Programat:</strong>{' '}
                              {format(
                                new Date(delivery.deliveryDate), // Folosim deliveryDate
                                'PPP',
                                { locale: ro }
                              )}
                              {delivery.deliverySlot && ( // Verificăm și afișăm deliverySlot
                                <>
                                  <br />
                                  <strong>Interval:</strong>{' '}
                                  {delivery.deliverySlot}
                                </>
                              )}
                            </div>
                          ) : (
                            // CAZ 2: Nu există dată programată, afișăm data solicitată
                            <div>
                              <strong>Livrare Solicitata la:</strong>{' '}
                              {/* Am schimbat label-ul */}
                              {format(
                                new Date(delivery.requestedDeliveryDate), // Folosim requestedDeliveryDate
                                'PPP',
                                { locale: ro }
                              )}
                              {delivery.requestedDeliverySlot && ( // Verificăm și afișăm requestedDeliverySlot
                                <>
                                  <br />
                                  <strong>Interval:</strong>{' '}
                                  {delivery.requestedDeliverySlot}
                                </>
                              )}
                            </div>
                          )}
                          {delivery.deliveryNotes && (
                            <div>
                              <strong>Note Livrare:</strong>{' '}
                              <i className='text-muted-foreground'>
                                {' '}
                                {delivery.deliveryNotes}
                              </i>
                            </div>
                          )}
                          {delivery.uitCode && (
                            <div>
                              <strong>Cod UIT:</strong> {delivery.uitCode}
                            </div>
                          )}
                          <ul className='list-disc pl-5 text-muted-foreground'>
                            {delivery.items.map((item: IDeliveryLineItem) => (
                              <li key={item._id.toString()}>
                                {item.quantity} {item.unitOfMeasure}
                                {' - '}
                                {item.productName}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className='mt-auto pt-2 border-t'>
                          <div className='flex justify-between font-semibold'>
                            <span>Total Livrare</span>
                            <span>
                              {formatCurrency(delivery.totals.grandTotal)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {/* --- SFÂRȘIT BLOC ÎNLOCUIT --- */}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
