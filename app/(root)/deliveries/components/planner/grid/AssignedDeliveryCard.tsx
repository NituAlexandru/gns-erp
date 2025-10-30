'use client'

import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { DELIVERY_STATUS_MAP } from '@/lib/db/modules/deliveries/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Box, CheckCircle2, FileText, MapPin, Truck, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

type DeliveryCardInfo = {
  delivery: IDelivery
  startSlot: string
  span: number
}

interface AssignedDeliveryCardProps {
  cardInfo: DeliveryCardInfo
  onSchedule: (delivery: IDelivery) => void
}

export function AssignedDeliveryCard({
  cardInfo,
  onSchedule,
}: AssignedDeliveryCardProps) {
  const { delivery } = cardInfo 

  const statusInfo = DELIVERY_STATUS_MAP[delivery.status] || {
    name: 'Necunoscut',
    variant: 'secondary',
  }

  const addressParts = [
    delivery.deliveryAddress.strada,
    delivery.deliveryAddress.numar,
    delivery.deliveryAddress.localitate,
    delivery.deliveryAddress.judet,
  ]
  const formattedAddress = addressParts.filter((part) => part).join(', ')

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Butonul cardului */}
        <button
          className={cn(
            'w-full h-full p-1 text-left rounded-md bg-card shadow-md hover:shadow-lg transition-all',
            'flex flex-col justify-center', 
            'border-l-4', 
            {
              // Culorile bordurii (logica neschimbată)
              'border-red-500': delivery.status === 'SCHEDULED',
              'border-yellow-500': delivery.status === 'IN_TRANSIT',
              'border-green-500': delivery.status === 'DELIVERED',
              'border-blue-500': delivery.status === 'INVOICED',
              'border-white opacity-60': delivery.status === 'CANCELLED',
              'border-border': delivery.status === 'CREATED',
            }
          )}
          onClick={() => onSchedule(delivery)}
        >
          {/* 1. Header Card (Client) */}
          <div className='mb-0.5'>
            {' '}
            {/* Spațiere mică */}
            <p className='text-xs text-muted-foreground truncate flex items-center gap-1'>
              <User className='h-3 w-3 flex-shrink-0' />
              {delivery.clientSnapshot.name}
            </p>
          </div>

          {/* 2. Conținut (Numere) */}
          <div>
            <p className='font-semibold text-xs truncate flex gap-1 items-center'>
              <Box className='h-4 w-3 flex-shrink-0' />
              {delivery.deliveryNumber?.substring(0, 5)}
            </p>
            <p className='font-semibold text-xs font-mono text-muted-foreground flex gap-1 items-center'>
              <Truck className='h-4 w-3 flex-shrink-0' />
              {delivery.orderNumber}
            </p>
          </div>
        </button>
      </TooltipTrigger>

      {/* Tooltip-ul (neschimbat) */}
      <TooltipContent className='max-w-xl p-4' side='right'>
        <div className='space-y-4 text-base'>
          <div className='flex justify-between items-center gap-2'>
            <div className='space-y-1'>
              <p className='text-lg font-semibold text-primary'>
                Comanda: {delivery.orderNumber}
              </p>
              <p className='text-sm font-mono text-muted-foreground -mt-1'>
          
                Livr: {delivery.deliveryNumber}
              </p>
            </div>{' '}
            <Badge
              variant={statusInfo.variant}
              className='self-start text-sm px-2 py-1'
            >
              {statusInfo.name}
            </Badge>
          </div>
          {/* Secțiunea Client/Adresă */}
          <div className='space-y-2 text-sm border-t pt-3 mt-3'>

            <div className='flex items-center gap-2'>
              <User className='h-4 w-4 flex-shrink-0' /> 
              <span className='font-medium text-foreground '>
                {delivery.clientSnapshot.name}
              </span>
            </div>
            <div className='flex items-start gap-2'>
              <MapPin className='h-4 w-4 flex-shrink-0 mt-0.5' />{' '}
            
              <span className=''>{formattedAddress}</span>
            </div>
          </div>
          {/* Secțiunea Transport/Programare */}
          <div className='space-y-2 text-sm border-t pt-3 mt-3'>
            <div className='flex items-center gap-2'>
              <Truck className='h-4 w-4 flex-shrink-0' /> 
              <span className='font-medium text-foreground truncate'>
                Sofer: {delivery.driverName || 'N/A'} | Auto:{' '}
                {delivery.vehicleNumber || 'N/A'}{' '}
                {delivery.trailerNumber && (
                  <span>| Remorcă: {delivery.trailerNumber} </span>
                )}
              </span>
            </div>
            <div className='font-semibold text-foreground'>
              Programat: {delivery.deliverySlots?.join(', ')}
            </div>
          </div>
          {/* Secțiunea Note/Articole */}
          <div className='border-t pt-3 mt-3 space-y-2 text-sm'>
            {delivery.deliveryNotes && (
              <p>
                <strong>Note Logistică:</strong> {delivery.deliveryNotes}
              </p>
            )}
            <p className='font-semibold pt-1'>Articole în livrare:</p>
            <ul className='list-disc list-inside '>
              {delivery.items.map((item: IDeliveryLineItem) => (
                <li key={item._id.toString()}>
                  {item.quantity} {item.unitOfMeasure} - {item.productName}
                </li>
              ))}
            </ul>
            <div className='border-t pt-2 mt-2 space-y-1  text-muted-foreground'>
              <p>
                Livrare creata de {delivery.createdByName} la data de{' '}
                {format(new Date(delivery.createdAt), 'Pp', { locale: ro })}
              </p>

              {delivery.lastUpdatedByName && (
                <p>
                  Programata de {delivery.lastUpdatedByName} la data de{' '}
                  {format(new Date(delivery.updatedAt), 'Pp', { locale: ro })}
                </p>
              )}
            </div>
          </div>
          <div className='border-t pt-3 mt-3 flex items-center justify-end gap-2'>
            <Button size='sm' variant='outline'>
              <FileText className='mr-2 h-4 w-4' />
              Generează Aviz
            </Button>
            <Button size='sm' variant='outline'>
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Confirmă Livrarea
            </Button>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
