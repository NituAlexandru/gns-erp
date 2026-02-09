'use client'

import { Eye, FileText, Pencil, Truck } from 'lucide-react'
import Link from 'next/link'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { PopulatedOrder } from '@/lib/db/modules/order/types'
import { OrderStatusBadge } from './OrderStatusBadge'
import { DELIVERY_METHODS } from '@/lib/db/modules/order/constants'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'

interface OrderPreviewProps {
  order: PopulatedOrder
}

export function OrderPreview({ order }: OrderPreviewProps) {
  const deliveries = order.deliveries || []

  const deliveryMethodLabel =
    DELIVERY_METHODS.find((m) => m.key === order.deliveryType)?.label ||
    order.deliveryType

  const formatAddress = (addr: any) => {
    if (!addr) return '-'
    if (typeof addr === 'string') return addr

    return [
      addr.strada ? `Str. ${addr.strada}` : null,
      addr.numar ? `nr. ${addr.numar}` : null,
      addr.alteDetalii,
      addr.localitate,
      addr.judet ? `Jud. ${addr.judet}` : null,
      addr.codPostal,
    ]
      .filter(Boolean)
      .join(', ')
  }
  const deliveryAddressString = formatAddress(order.deliveryAddress)

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8 hover:bg-muted'>
          <Eye className='h-4 w-4 text-muted-foreground hover:text-foreground transition-colors' />
          <span className='sr-only'>Previzualizare</span>
        </Button>
      </HoverCardTrigger>

      <HoverCardContent
        side='left'
        align='start'
        sideOffset={10}
        collisionPadding={100}
        className='w-[900px] p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-slate-800 
                   data-[state=open]:animate-in data-[state=closed]:animate-out 
                   data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
                   data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
                   data-[side=left]:slide-in-from-right-4 
                   duration-300 ease-in-out'
      >
        <div className='max-h-[85vh] overflow-y-auto bg-card'>
          <div className='p-2 space-y-2'>
            {/* 1. HEADER */}
            <div className='flex flex-col sm:flex-row justify-between sm:items-start gap-2'>
              <div>
                <h1 className='text-2xl font-bold'>
                  Comandă #{order.orderNumber}
                </h1>
                <p className='text-muted-foreground text-xs'>
                  Creată la: {new Date(order.createdAt).toLocaleString('ro-RO')}{' '}
                  de {order.salesAgent?.name || 'N/A'}
                </p>
              </div>
              <div className='flex flex-col gap-1'>
                <div className='flex items-center gap-2 scale-90 origin-right'>
                  <Button
                    variant='outline'
                    size='sm'
                    asChild
                    title='Editează Comanda'
                  >
                    <Link href={`/orders/${order._id}/edit`}>
                      Modifică <Pencil className='h-3 w-3 ml-1' />
                    </Link>
                  </Button>

                  <Button
                    variant='outline'
                    size='sm'
                    asChild
                    title='Planifică Livrări'
                  >
                    <Link href={`/deliveries/new?orderId=${order._id}`}>
                      Livrări <Truck className='ml-1 h-3 w-3' />
                    </Link>
                  </Button>

                  <OrderStatusBadge status={order.status} />
                </div>
                {deliveries && deliveries.some((d) => d.deliveryNoteId) && (
                  <div className='flex flex-wrap gap-2 justify-end'>
                    {deliveries.map((d) => {
                      if (!d.deliveryNoteId) return null

                      return (
                        <Link
                          key={d.deliveryNoteId.toString()}
                          href={`/financial/delivery-notes/${d.deliveryNoteId.toString()}`}
                          className='text-xs font-mono border px-1 py-0.5 rounded flex items-center gap-1 hover:underline transition-colors bg-secondary text-primary'
                          title={`Aviz generat din livrarea #${d.deliveryNumber}`}
                        >
                          <FileText className='h-3 w-3 opacity-70' />
                          {d.deliveryNoteNumber || 'Aviz'}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-2'>
              {/* 2. Coloana Stângă (Detalii Client & Logistică) */}
              <div className='lg:col-span-2 space-y-6'>
                <div className='border rounded-xl p-2 shadow-sm bg-card text-card-foreground'>
                  <h3 className='font-semibold text-sm mb-2'>
                    Detalii Client și Livrare
                  </h3>
                  <div className='text-xs space-y-4'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                      {/* Date Facturare */}
                      <div className='col-span-1'>
                        <h3 className='font-semibold mb-1 text-muted-foreground uppercase text-xs'>
                          Date Facturare
                        </h3>
                        <p className='font-medium text-base'>
                          {order.clientSnapshot.name}
                        </p>
                        <p className='text-muted-foreground'>
                          CUI:{' '}
                          <span className='font-medium text-foreground'>
                            {order.clientSnapshot.cui}
                          </span>
                        </p>
                        <p className='text-muted-foreground'>
                          Reg. Com:{' '}
                          <span className='font-medium text-foreground'>
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
                            {order.clientSnapshot.bank}
                          </span>
                        </p>
                        <p className='text-muted-foreground'>
                          IBAN:{' '}
                          <span className='font-medium text-foreground'>
                            {order.clientSnapshot.iban}
                          </span>
                        </p>
                        <p className='text-muted-foreground'>
                          Agent:{' '}
                          <span className='font-medium text-foreground'>
                            {order.salesAgentSnapshot.name}
                          </span>
                        </p>
                      </div>

                      {/* Detalii Logistice */}
                      <div className='col-span-1'>
                        <h3 className='font-semibold mb-1 text-muted-foreground uppercase text-xs'>
                          Detalii Logistice
                        </h3>
                        <p className='text-muted-foreground'>
                          Adresă:{' '}
                          <span className='font-medium text-foreground'>
                            {deliveryAddressString}
                          </span>
                        </p>
                        <p className='text-muted-foreground'>
                          Mod Livrare:{' '}
                          <span className='font-medium text-foreground'>
                            {deliveryMethodLabel}
                          </span>
                        </p>
                        <p className='text-muted-foreground'>
                          Vehicul:{' '}
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
                            Timp:{' '}
                            <span className='font-medium text-foreground'>
                              {formatMinutes(order.travelTimeInMinutes)}
                            </span>
                          </p>
                        </div>
                        <p className='text-muted-foreground'>
                          Cost Transport:{' '}
                          <span className='font-medium text-foreground'>
                            {formatCurrency(order.recommendedShippingCost || 0)}
                          </span>
                        </p>
                        {order.notes && (
                          <div className='mt-2 p-2 bg-muted/50 rounded text-xs'>
                            <p className='font-semibold'>Mentiuni:</p>
                            <p>{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* 5. Livrări Planificate (Simplificat - DOAR LINKURI) */}
                {deliveries && deliveries.length > 0 && (
                  <div className='lg:col-span-3'>
                    <div className='border rounded-xl p-2 shadow-sm bg-card text-card-foreground'>
                      <h3 className='font-semibold text-xs mb-2 flex items-center gap-2'>
                        <Truck className='h-5 w-5' /> Livrări Asociate (
                        {deliveries.length})
                      </h3>
                      <div className='flex flex-wrap gap-2'>
                        {deliveries.map((delivery) => {
                          // Asigurăm cheia unică
                          const deliveryKey =
                            typeof delivery._id === 'string'
                              ? delivery._id
                              : delivery._id.toString()

                          return (
                            <Link
                              key={deliveryKey}
                              href={`/deliveries/new?orderId=${order._id}`}
                              className='flex items-center gap-2 px-3 py-1 border rounded-md text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted hover:border-gray-400 transition-colors'
                            >
                              <Truck className='h-3 w-3' />
                              <span>#{delivery.deliveryNumber}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Coloana Dreaptă (Sumar Financiar) */}
              <div className='border rounded-xl p-2 shadow-sm bg-card text-card-foreground flex flex-col'>
                <h3 className='font-semibold text-sm mb-4'>Sumar Financiar</h3>
                <div className='flex-grow flex flex-col text-xs'>
                  <div className='flex-grow space-y-0'>
                    {/* Articole */}
                    <div className='flex justify-between font-medium'>
                      <span>Subtotal Articole</span>
                      <span>
                        {formatCurrency(order.totals.productsSubtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-xs text-muted-foreground mb-0'>
                      <span className='pl-2'>TVA Articole</span>
                      <span>{formatCurrency(order.totals.productsVat)}</span>
                    </div>

                    {/* Ambalaje */}
                    <div className='flex justify-between font-medium'>
                      <span>Subtotal Ambalaje</span>
                      <span>
                        {formatCurrency(order.totals.packagingSubtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-xs text-muted-foreground mb-0'>
                      <span className='pl-2'>TVA Ambalaje</span>
                      <span>{formatCurrency(order.totals.packagingVat)}</span>
                    </div>

                    {/* Servicii */}
                    <div className='flex justify-between font-medium'>
                      <span>Subtotal Servicii</span>
                      <span>
                        {formatCurrency(order.totals.servicesSubtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between text-xs text-muted-foreground mb-0'>
                      <span className='pl-2'>TVA Servicii</span>
                      <span>{formatCurrency(order.totals.servicesVat)}</span>
                    </div>

                    {/* Manual */}
                    <div className='flex justify-between font-medium'>
                      <span>Subtotal Manual</span>
                      <span>{formatCurrency(order.totals.manualSubtotal)}</span>
                    </div>
                    <div className='flex justify-between text-xs text-muted-foreground mb-0'>
                      <span className='pl-2'>TVA Manual</span>
                      <span>{formatCurrency(order.totals.manualVat)}</span>
                    </div>
                  </div>

                  <div className='mt-2 pt-2 border-t'>
                    <div className='flex justify-between text-md font-semibold'>
                      <span>Subtotal General</span>
                      <span>{formatCurrency(order.totals.subtotal)}</span>
                    </div>
                    <div className='flex justify-between text-md font-semibold'>
                      <span>TVA General</span>
                      <span>{formatCurrency(order.totals.vatTotal)}</span>
                    </div>
                    <div className='flex justify-between text-sm font-bold mt-2 text-primary'>
                      <span>Total General</span>
                      <span>{formatCurrency(order.totals.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Articole Comandă */}
              <div className='lg:col-span-3'>
                <div className='border rounded-xl shadow-sm bg-card text-card-foreground overflow-hidden'>
                  <div className='p-4 border-b'>
                    <h3 className='font-semibold text-sm'>Articole Comandă</h3>
                  </div>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow className='bg-muted/50'>
                          <TableHead>Produs/Serviciu</TableHead>
                          <TableHead className='text-right'>
                            Cant. Cmd
                          </TableHead>
                          <TableHead className='text-right'>
                            Cant. Livr
                          </TableHead>
                          <TableHead>U.M.</TableHead>
                          <TableHead className='text-right'>
                            Preț Unit
                          </TableHead>
                          <TableHead className='text-right'>Valoare</TableHead>
                          <TableHead className='text-right'>TVA</TableHead>
                          <TableHead className='text-right'>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.lineItems.map((item) => (
                          <TableRow
                            key={item._id}
                            className='text-xs sm:text-xs'
                          >
                            <TableCell
                              className='font-medium max-w-[200px] truncate'
                              title={item.productName}
                            >
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
