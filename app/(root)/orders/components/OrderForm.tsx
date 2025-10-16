'use client'

import { useCallback, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DeliveryAddressSelector } from './DeliveryAddressSelector'
import { OrderLogistics } from './OrderLogistics'
import { OrderItemsManager } from './OrderItemsManager'
import { OrderTotals } from './OrderTotals'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

import {
  createOrder,
  calculateShippingCost,
} from '@/lib/db/modules/order/order.actions'
import {
  CreateOrderInput,
  CreateOrderInputSchema,
} from '@/lib/db/modules/order/types'
import { IClientDoc, IAddress } from '@/lib/db/modules/client/types'
import { EntitySelector } from './mini-components/EntitySelector'
import { round2 } from '@/lib/utils'

export function OrderForm({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()

  const methods = useForm<CreateOrderInput>({
    resolver: zodResolver(CreateOrderInputSchema),
    defaultValues: {
      entityType: 'client',
      lineItems: [],
      estimatedTransportCount: 1,
      notes: '',
      shippingCost: 0,
      clientSnapshot: { name: '', cui: '', regCom: '', address: '', judet: '' },
      deliveryAddress: {
        strada: '',
        numar: '',
        localitate: '',
        judet: '',
        codPostal: '',
      },
    },
  })

  // const { watch } = methods

  // useEffect(() => {
  //   const subscription = watch((value, { name, type }) => {
  //     console.group(
  //       `%cFormular actualizat de: ${name || 'unknown'}`,
  //       'color: blue; font-weight: bold;'
  //     )
  //     console.log('Tip eveniment:', type)
  //     console.log('Date complete:', value)
  //     console.groupEnd()
  //   })

  //   return () => subscription.unsubscribe()
  // }, [watch])

  const [selectedClient, setSelectedClient] = useState<IClientDoc | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<IAddress | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClientSelect = useCallback(
    (client: IClientDoc | null) => {
      setSelectedClient(client)
      setSelectedAddress(null)

      methods.setValue('clientId', client?._id || '')
      if (client) {
        methods.setValue('clientSnapshot', {
          name: client.name,
          cui: client.vatId ?? '',
          regCom: client.nrRegComert ?? '',
          address: `${client.address.strada}, ${client.address.localitate}`,
          judet: client.address.judet,
          bank: client.bankAccountLei?.bankName ?? '',
          iban: client.bankAccountLei?.iban ?? '',
        })
      } else {
        methods.resetField('clientSnapshot')
      }
      methods.resetField('deliveryAddress')
    },
    [methods]
  )

  const handleAddressSelect = useCallback(
    (address: IAddress | null) => {
      setSelectedAddress(address)
      if (address) {
        methods.setValue('deliveryAddress', { ...address })
      } else {
        methods.resetField('deliveryAddress')
      }
    },
    [methods]
  )

  const onSubmit = async (data: CreateOrderInput) => {
    setIsSubmitting(true)

    data.distanceInKm = selectedAddress?.distanceInKm || 0
    data.travelTimeInMinutes = selectedAddress?.travelTimeInMinutes || 0

    // Logica de calcul a costului de transport rămâne aici
    const finalShippingCost =
      selectedAddress?.distanceInKm && data.estimatedVehicleType
        ? await calculateShippingCost(
            data.estimatedVehicleType,
            selectedAddress.distanceInKm
          )
        : 0
    data.shippingCost = round2(finalShippingCost)

    // Apelăm `createOrder` cu statusul 'CONFIRMED'
    const result = await createOrder(data, 'CONFIRMED')

    if (result.success) {
      toast.success(result.message)
      router.push('/orders')
    } else {
      toast.error('A apărut o eroare', { description: result.message })
    }
    setIsSubmitting(false)
  }

  const onSaveDraft = async () => {
    setIsSubmitting(true)
    const data = methods.getValues()

    data.distanceInKm = selectedAddress?.distanceInKm || 0
    data.travelTimeInMinutes = selectedAddress?.travelTimeInMinutes || 0

    const finalShippingCost =
      selectedAddress?.distanceInKm && data.estimatedVehicleType
        ? await calculateShippingCost(
            data.estimatedVehicleType,
            selectedAddress.distanceInKm
          )
        : 0
    data.shippingCost = round2(finalShippingCost)

    // Apelăm `createOrder` cu statusul 'DRAFT'
    const result = await createOrder(data as CreateOrderInput, 'DRAFT')

    if (result.success) {
      toast.success(result.message)
      router.push('/orders')
    } else {
      toast.error('A apărut o eroare la salvarea ciornei', {
        description: result.message,
      })
    }
    setIsSubmitting(false)
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className='space-y-6'>
        <h1 className='text-2xl font-bold'>Creare Comandă Nouă</h1>
        <div className='grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_auto] gap-4 p-4 border rounded-lg'>
          {/* Coloana 1: Detalii Client (cea mai lată dintre cele flexibile) */}
          <div className='p-4 border rounded-lg flex flex-col space-y-4'>
            {' '}
            <EntitySelector
              onClientSelect={handleClientSelect}
              selectedClient={selectedClient}
            />
            {selectedClient && (
              <DeliveryAddressSelector
                client={selectedClient}
                onAddressSelect={handleAddressSelect}
              />
            )}
          </div>

          {/* Coloana 2: Detalii Logistice */}
          <div className='p-4 border rounded-lg flex flex-col'>
            <h2 className='text-lg font-semibold mb-2'>Detalii Logistice</h2>
            <OrderLogistics />
          </div>

          {/* Coloana 3: Mențiuni (cu textarea h-full) */}
          <div className='p-4 border rounded-lg flex flex-col'>
            <h2 className='text-lg font-semibold mb-2'>Mențiuni</h2>
            <Textarea
              placeholder='Adaugă notițe sau mențiuni speciale pentru această comandă...'
              {...methods.register('notes')}
              className='flex-grow h-full min-h-[100px]'
            />
          </div>

          {/* Coloana 4: Totaluri Comandă (lățime automată) */}

          <OrderTotals />
        </div>

        <div className='p-4 border rounded-lg'>
          <h2 className='hidden text-lg font-semibold mb-2'>
            Articole Comandă
          </h2>
          <OrderItemsManager isAdmin={isAdmin} />
        </div>

        <div className='flex justify-end gap-4'>
          <Button
            type='button'
            variant='outline'
            onClick={onSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Se salvează...' : 'Salvează Ciornă'}
          </Button>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Se salvează...' : 'Confirmă și Salvează Comanda'}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
