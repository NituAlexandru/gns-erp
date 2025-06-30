'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatDateTime } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import ProductPrice from '../product/product-price'
import {
  deliverOrder,
  updateOrderToPaid,
} from '@/lib/db/modules/order/order.actions'
import ActionButton from '../action-button'
import { IOrder } from '@/lib/db/modules/order/order.model'

export default function OrderDetailsForm({
  order,
  isAdmin,
}: {
  order: IOrder
  isAdmin: boolean
}) {
  const {
    _id, // -pt in procesare
    shippingAddress,
    items,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
    paymentMethod,
    isPaid,
    paidAt,
    isDelivered,
    deliveredAt,
    expectedDeliveryDate,
  } = order

  // pt in procesare
  const isProcessing =
    typeof window !== 'undefined' &&
    localStorage.getItem(`order-${_id}-processing`) === 'true'
  // -------------

  return (
    <div className='grid md:grid-cols-3 md:gap-5'>
      <div className='overflow-x-auto md:col-span-2 space-y-4'>
        <Card>
          <CardContent className='p-4 gap-4'>
            <h2 className='text-xl pb-4'>Adresă de livrare</h2>
            <p>
              {shippingAddress.adressName} {shippingAddress.phone}
            </p>
            <p>
              {shippingAddress.street}, {shippingAddress.city},{' '}
              {shippingAddress.province}, {shippingAddress.postalCode},{' '}
              {shippingAddress.country}{' '}
            </p>

            {isDelivered ? (
              <Badge>
                Livrat la data de {formatDateTime(deliveredAt!).dateTime}
              </Badge>
            ) : (
              <div>
                {' '}
                <Badge variant='destructive'>Nelivrat</Badge>
                <div>
                  Livrare estimată la data de{' '}
                  <span className='text-green-600 font-bold'>
                    {' '}
                    {formatDateTime(expectedDeliveryDate!).dateOnly}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4 gap-4'>
            <h2 className='text-xl pb-4'>Metoda de plată</h2>
            <p>{paymentMethod}</p>

            {isPaid ? (
              <Badge>
                Plătit la data de {formatDateTime(paidAt!).dateTime}
              </Badge>
            ) : (
              <div className='flex flex-wrap gap-2'>
                <Badge variant='destructive'>Neplătită</Badge>
                {isProcessing && ( // pt in procesare
                  <Badge variant='destructive'>În procesare…</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4   gap-4'>
            <h2 className='text-xl pb-4'>Produse comandate</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produs</TableHead>
                  {isAdmin && <TableHead>Cod produs</TableHead>}
                  <TableHead>Cantitate</TableHead>
                  <TableHead className='text-right'>Preț</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.slug}>
                    <TableCell>
                      {item.category === 'Paleti' ? (
                        <div className='flex items-center'>
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={50}
                            height={50}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'contain',
                            }}
                          />
                          <span className='px-2'>{item.name}</span>
                        </div>
                      ) : (
                        <Link
                          href={`/product/${item.slug}`}
                          className='flex items-center'
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={50}
                            height={50}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                            }}
                          />
                          <span className='px-2'>{item.name}</span>
                        </Link>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>{item.productCode || 'N/A'}</TableCell>
                    )}
                    <TableCell>
                      <span className='px-2'>{item.quantity}</span>
                    </TableCell>
                    <TableCell className='text-right'>
                      {item.price} RON
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardContent className='p-4  space-y-4 gap-4'>
            <h2 className='text-xl pb-4'>Sumar comandă</h2>
            <div className='flex justify-between'>
              <div>Produse</div>
              <div>
                {' '}
                <ProductPrice price={itemsPrice - taxPrice} plain />
              </div>
            </div>
            <div className='flex justify-between'>
              <div className='text-muted-foreground'>TVA</div>
              <div className='text-muted-foreground'>
                {' '}
                <ProductPrice price={taxPrice} plain />
              </div>
            </div>
            <div className='flex justify-between'>
              <div>Transport</div>
              <div>
                {' '}
                <ProductPrice price={shippingPrice} plain />
              </div>
            </div>
            <div className='flex justify-between'>
              <div>Total</div>
              <div>
                {' '}
                <ProductPrice price={totalPrice} plain />
              </div>
            </div>

            {!isPaid && ['Card'].includes(paymentMethod) && (
              <Link
                className={cn(buttonVariants(), 'w-full')}
                href={`/checkout/${order._id}`}
              >
                Plătește comanda
              </Link>
            )}

            {isAdmin &&
              !isPaid &&
              ['Ordin de plata', 'Numerar la livrare', 'Card'].includes(
                paymentMethod
              ) && (
                <ActionButton
                  caption='Marchează ca plătită'
                  action={() => updateOrderToPaid(order._id)}
                />
              )}
            {isAdmin && isPaid && !isDelivered && (
              <ActionButton
                caption='Marchează ca livrată'
                action={() => deliverOrder(order._id)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
