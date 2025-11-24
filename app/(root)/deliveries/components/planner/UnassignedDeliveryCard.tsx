'use client'

import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CalendarCog,
  User,
  Truck,
  MapPin,
  Store,
  ExternalLink,
  Package,
  Box,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import { DELIVERY_METHODS } from '@/lib/db/modules/order/constants'

interface UnassignedDeliveryCardProps {
  delivery: IDelivery
  onSchedule: (delivery: IDelivery) => void
}

export function UnassignedDeliveryCard({
  delivery,
  onSchedule,
}: UnassignedDeliveryCardProps) {
  const deliveryMethodLabel =
    DELIVERY_METHODS.find((m) => m.key === delivery.deliveryType)?.label ||
    delivery.deliveryType ||
    'Livrare Standard'

  const isThirdParty = delivery.isThirdPartyHauler
  const isPickUp = delivery.deliveryType === 'PICK_UP_SALE'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className='mb-2 bg-card shadow-sm py-3'>
          <CardHeader className='p-3 pb-0 pt-0'>
            <div className='flex flex-row justify-between'>
              <Badge
                variant={
                  DELIVERY_STATUS_MAP[delivery.status]?.variant || 'secondary'
                }
                className='text-[10px] px-1.5 py-0.5'
              >
                {DELIVERY_STATUS_MAP[delivery.status]?.name || delivery.status}
              </Badge>{' '}
              {/* Butonul de Programare */}
              <Button
                size='icon'
                variant='ghost'
                className='h-7 w-7 flex-shrink-0'
                onClick={(e) => {
                  e.stopPropagation()
                  onSchedule(delivery)
                }}
                title='Programează / Asignează'
              >
                <CalendarCog className='h-4 w-4' />
              </Button>
            </div>
            <div className='flex justify-between items-start'>
              {/* Secțiunea Titlu (cu Nr. Comandă și Nr. Livrare) */}
              <div>
                <CardTitle className='text-sm text-primary'>
                  {delivery.orderNumber}
                </CardTitle>
                <p className='text-xs font-mono text-muted-foreground'>
                  Livr: {delivery.deliveryNumber}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className='p-3 pt-0 text-xs space-y-1 text-muted-foreground'>
            {/* Client */}
            <div className='flex items-center gap-2'>
              <User className='h-3 w-3 flex-shrink-0' />
              <span className='font-medium text-foreground truncate'>
                {delivery.clientSnapshot.name}
              </span>
            </div>
            {/* Adresa */}
            <div className='flex items-center gap-2'>
              <MapPin className='h-3 w-3 flex-shrink-0' />
              <span className='truncate'>
                Str. {delivery.deliveryAddress.strada} <br />
                nr. {delivery.deliveryAddress.numar},{' '}
                {delivery.deliveryAddress.localitate},{' '}
                {delivery.deliveryAddress.judet}
              </span>
            </div>
            {/* Vehicul */}
            <div className='flex items-center gap-2'>
              <Truck className='h-3 w-3 flex-shrink-0' />
              <span className='truncate text-primary'>
                {delivery.vehicleType}
              </span>
            </div>{' '}
            <div className=' font-bold mt-2 flex flex-col gap-0.5'>
              {isPickUp && (
                <div className='flex items-center gap-2  font-bold'>
                  <Store className='h-3 w-3' />
                  <span className='text-red-600'>{deliveryMethodLabel}</span>
                </div>
              )}

              {/* CAZ 2: TRANSPORTATOR TERȚ (Indiferent de metodă) */}
              {isThirdParty && (
                <div className='flex flex-col gap-1'>
                  {/* Afișăm metoda (ex: Vânzare Directă) */}
                  <div className='flex items-center gap-2 text-muted-foreground font-semibold'>
                    <Package className='h-3 w-3' />{' '}
                    <span className=' text-red-600'>{deliveryMethodLabel}</span>
                  </div>
                  {/* Afișăm eticheta de Terț distinct */}
                  <div className='flex items-center gap-2  font-bold'>
                    <ExternalLink className='h-3 w-3' />
                    <span className='text-red-600'>Transportator Terț</span>
                  </div>
                </div>
              )}

              {/* CAZ 3: FLOTĂ PROPRIE (Nici PickUp, Nici Terț) */}
              {!isPickUp && !isThirdParty && (
                <div className='flex items-center gap-2 font-bold '>
                  <Box className='h-3 w-3' />
                  <span className='text-red-600'>{deliveryMethodLabel}</span>
                </div>
              )}
            </div>
            {/* Articole */}
            {/* Sloturi Solicitate */}
            <div className='font-semibold text-foreground pt-1'>
              <p>
                Ore Solicitate: {delivery.requestedDeliverySlots.join(', ')}
              </p>
              <p>
                Data Solicitată:{' '}
                {format(new Date(delivery.requestedDeliveryDate), 'PPP', {
                  locale: ro,
                })}
              </p>
              <p>Agent: {delivery.salesAgentSnapshot.name}</p>
              {delivery.deliveryNotes && (
                <p className='text-muted-foreground'>
                  Mentiuni Agent: {delivery.deliveryNotes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>

      {/* --- Tooltip-ul cu TOATE detaliile --- */}
      <TooltipContent className='max-w-xl' side='right'>
        <div className='p-1 space-y-1'>
          <h3 className='mb-5'>
            <strong className='text-xl '>Articole Comanda:</strong>
          </h3>
          <ul className='list-disc list-inside '>
            {delivery.items.map((item: IDeliveryLineItem) => (
              <li key={item._id.toString()}>
                {item.quantity} {item.unitOfMeasure} - {item.productName}
              </li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
