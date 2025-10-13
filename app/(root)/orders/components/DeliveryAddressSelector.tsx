'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IClientDoc, IAddress } from '@/lib/db/modules/client/types'
import { MapPin, Clock } from 'lucide-react'
import { formatMinutes } from '@/lib/db/modules/client/client.utils'

interface DeliveryAddressSelectorProps {
  client: IClientDoc | null
  onAddressSelect: (address: IAddress | null) => void
}

export function DeliveryAddressSelector({
  client,
  onAddressSelect,
}: DeliveryAddressSelectorProps) {
  const [selectedAddress, setSelectedAddress] = useState<IAddress | null>(null)

  const deliveryAddresses = client?.deliveryAddresses || []
  const isDisabled = !client || deliveryAddresses.length === 0

  useEffect(() => {
    if (client && client.deliveryAddresses.length > 0) {
      const defaultDeliveryAddress = client.deliveryAddresses[0]
      setSelectedAddress(defaultDeliveryAddress)
      onAddressSelect(defaultDeliveryAddress)
    } else {
      setSelectedAddress(null)
      onAddressSelect(null)
    }
  }, [client, onAddressSelect])

  const handleSelectChange = (addressJson: string) => {
    if (addressJson) {
      const addressObject: IAddress = JSON.parse(addressJson)
      setSelectedAddress(addressObject)
      onAddressSelect(addressObject)
    } else {
      setSelectedAddress(null)
      onAddressSelect(null)
    }
  }

  const getPlaceholder = () => {
    if (!client) {
      return 'Selectează un client mai întâi'
    }
    if (deliveryAddresses.length === 0) {
      return 'Clientul nu are adrese de livrare'
    }
    return 'Alege o adresă de livrare...'
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 w-full md:w-[400px]'>
        <label
          className={`font-medium ${!client ? 'text-muted-foreground' : ''}`}
        >
          Selectează Adresa de Livrare
        </label>
        <Select
          onValueChange={handleSelectChange}
          disabled={isDisabled}
          value={selectedAddress ? JSON.stringify(selectedAddress) : ''}
        >
          <SelectTrigger>
            <SelectValue placeholder={getPlaceholder()} />
          </SelectTrigger>
          <SelectContent>
            {deliveryAddresses.map((addr, index) => (
               <SelectItem key={addr._id || index} value={JSON.stringify(addr)}>
                {`${addr.strada}, ${addr.numar}, ${addr.localitate}, ${addr.judet}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAddress && (
        <div className='p-3 border rounded-md bg-muted text-sm flex items-center gap-6 w-full md:w-[400px]'>
          <div className='flex items-center gap-2'>
            <MapPin className='h-4 w-4 text-muted-foreground' />
            <div>
              <span className='font-semibold'>
                {selectedAddress.distanceInKm
                  ? selectedAddress.distanceInKm.toFixed(1)
                  : 0}{' '}
                km
              </span>
              <span className='text-muted-foreground'> (dus-întors)</span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Clock className='h-4 w-4 text-muted-foreground' />
            <div>
              <span className='font-semibold'>
                {formatMinutes(selectedAddress.travelTimeInMinutes)}
              </span>
              <span className='text-muted-foreground'> (dus-întors)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
