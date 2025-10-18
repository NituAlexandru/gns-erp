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

  const activeDeliveryAddresses =
    client?.deliveryAddresses.filter((addr) => addr.isActive) || []
  const isDisabled = !client || activeDeliveryAddresses.length === 0

  useEffect(() => {
    if (client && activeDeliveryAddresses.length > 0) {
      const defaultAddr = activeDeliveryAddresses[0]
      setSelectedAddress(defaultAddr)
      onAddressSelect(defaultAddr)
    } else {
      setSelectedAddress(null)
      onAddressSelect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  const handleSelectChange = (addressId: string) => {
    const addressObject = activeDeliveryAddresses.find(
      (addr) => addr._id === addressId
    )
    if (addressObject) {
      setSelectedAddress(addressObject)
      onAddressSelect(addressObject)
    }
  }

  const getPlaceholder = () => {
    if (!client) return 'Selectează un client'
    if (activeDeliveryAddresses.length === 0) return 'Nu există adrese active'
    return 'Alege o adresă de livrare...'
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-2 w-full md:w-[400px] mt-2'>
        <label
          className={`font-medium ${!client ? 'text-muted-foreground' : ''}`}
        >
          Selectează Adresa de Livrare
        </label>
        <Select
          onValueChange={handleSelectChange}
          disabled={isDisabled}
          value={selectedAddress?._id || ''}
        >
          <SelectTrigger>
            <SelectValue placeholder={getPlaceholder()} />
          </SelectTrigger>
          <SelectContent>
            {activeDeliveryAddresses.map((addr) => (
              <SelectItem key={addr._id!} value={addr._id!}>
                {`${addr.strada}, ${addr.numar}, ${addr.localitate}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAddress && (
        <div className='p-3 border rounded-md bg-muted text-sm flex items-center gap-6 w-full md:w-[400px]'>
          <div className='flex items-center gap-2'>
            <MapPin className='h-4 w-4 text-muted-foreground' />
            <span>{selectedAddress.distanceInKm?.toFixed(1) ?? 0} km</span>
          </div>
          <div className='flex items-center gap-2'>
            <Clock className='h-4 w-4 text-muted-foreground' />
            <span>{formatMinutes(selectedAddress.travelTimeInMinutes)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
