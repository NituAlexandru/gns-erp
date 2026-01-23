'use client'

import { useCallback, useState, useEffect } from 'react'
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
  getOrderFormInitialData,
  updateOrder,
  confirmOrder,
} from '@/lib/db/modules/order/order.actions'
import {
  CreateOrderInput,
  CreateOrderInputSchema,
  PopulatedOrder,
  OrderLineItemInput,
} from '@/lib/db/modules/order/types'
import { IClientDoc, IAddress } from '@/lib/db/modules/client/types'
import { EntitySelector } from './mini-components/EntitySelector'
import { round2 } from '@/lib/utils'
import { ShippingRateDTO } from '@/lib/db/modules/setting/shipping-rates/types'
import { VatRateDTO } from '@/lib/db/modules/setting/vat-rate/types'
import { SearchedService } from '@/lib/db/modules/setting/services/types'
import { getClientById } from '@/lib/db/modules/client/client.actions'
import { ClientWithSummary } from '@/lib/db/modules/client/summary/client-summary.model'

type InitialData = {
  shippingRates: ShippingRateDTO[]
  vatRates: VatRateDTO[]
  services: SearchedService[]
  permits: SearchedService[]
}

interface OrderFormProps {
  isAdmin: boolean
  initialOrderData?: PopulatedOrder | null
  isEditing?: boolean
}

export function OrderForm({
  isAdmin,
  initialOrderData,
  isEditing = false,
}: OrderFormProps) {
  const router = useRouter()

  const methods = useForm<CreateOrderInput>({
    resolver: zodResolver(CreateOrderInputSchema),
  })

  const [selectedClient, setSelectedClient] =
    useState<ClientWithSummary | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<IAddress | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [initialDataForm, setInitialDataForm] = useState<InitialData | null>(
    null,
  )
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isClientLoading, setIsClientLoading] = useState(false)

  // useEffect pentru datele generale ale formularului
  useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true)
      const result = await getOrderFormInitialData()
      if (result.success) {
        setInitialDataForm(result.data)
      } else {
        toast.error('Eroare la încărcarea datelor', {
          description: result.message,
        })
      }
      setIsLoadingData(false)
    }
    fetchData()
  }, [])

  // useEffect pentru pre-popularea formularului + fetch client complet
  useEffect(() => {
    // Rulează doar după ce datele generale s-au încărcat
    if (!isLoadingData && initialDataForm) {
      if (isEditing && initialOrderData) {
        // Mod Editare
        methods.reset({
          entityType: initialOrderData.entityType,
          clientId: initialOrderData.client?._id || '',
          clientSnapshot: initialOrderData.clientSnapshot,
          deliveryAddress: initialOrderData.deliveryAddress,
          deliveryAddressId: initialOrderData.deliveryAddressId?.toString(),
          delegate: initialOrderData.delegate,
          lineItems: initialOrderData.lineItems.map(
            (item) =>
              ({
                ...item,
                _id: item._id?.toString(),
                productId: item.productId?.toString() || null,
                serviceId: item.serviceId?.toString() || null,
                minimumSalePrice: item.minimumSalePrice,
                vatRateDetails: item.vatRateDetails,
                baseUnit: item.baseUnit,
                packagingOptions: item.packagingOptions || [],
                stockableItemType: item.stockableItemType,
                weight: item.weight,
                volume: item.volume,
                length: item.length,
                width: item.width,
                height: item.height,
                packagingUnit: item.packagingUnit,
                packagingQuantity: item.packagingQuantity,
                isPerDelivery: item.isPerDelivery,
              }) as OrderLineItemInput,
          ),
          deliveryType: initialOrderData.deliveryType,
          estimatedVehicleType: initialOrderData.estimatedVehicleType,
          estimatedTransportCount: initialOrderData.estimatedTransportCount,
          distanceInKm: initialOrderData.distanceInKm,
          travelTimeInMinutes: initialOrderData.travelTimeInMinutes,
          notes: initialOrderData.notes || '',
          recommendedShippingCost:
            initialOrderData.recommendedShippingCost || 0,
        })

        setSelectedAddress(initialOrderData.deliveryAddress as IAddress)

        if (initialOrderData.client?._id) {
          setIsClientLoading(true)
          getClientById(initialOrderData.client._id)
            .then((fullClient) => {
              if (fullClient) setSelectedClient(fullClient)
            })
            .catch((err) =>
              console.error('Error fetching client for edit:', err),
            )
            .finally(() => setIsClientLoading(false))
        } else {
          setSelectedClient(null)
        }
      } else {
        // Mod Creare
        methods.reset({
          entityType: 'client',
          lineItems: [],
          estimatedTransportCount: 1,
          notes: '',
          recommendedShippingCost: 0,
          clientSnapshot: {
            name: '',
            cui: '',
            regCom: '',
            address: '',
            judet: '',
          },
          deliveryAddress: {
            strada: '',
            numar: '',
            localitate: '',
            judet: '',
            codPostal: '',
          },
        })
        setSelectedClient(null)
        setSelectedAddress(null)
      }
    }
  }, [isEditing, initialOrderData, methods, isLoadingData, initialDataForm]) // Dependențe corecte

  const handleClientSelect = useCallback(
    (client: IClientDoc | null) => {
      setSelectedClient(client)
      setSelectedAddress(null)

      methods.setValue('clientId', client?._id || '')
      if (client) {
        const isPerson = client.clientType === 'Persoana fizica'

        methods.setValue('clientSnapshot', {
          name: client.name,
          cui: !isPerson ? client.vatId || '' : '',
          cnp: isPerson ? client.cnp || '' : '',
          regCom: !isPerson ? client.nrRegComert || '' : '',
          address: `${client.address.strada}, ${client.address.localitate}`,
          judet: client.address.judet,
          bank: client.bankAccountLei?.bankName ?? '',
          iban: client.bankAccountLei?.iban ?? '',
        })
        if (
          !isEditing ||
          (initialOrderData && client._id !== initialOrderData.client?._id)
        ) {
          methods.resetField('deliveryAddress')
          methods.resetField('deliveryAddressId')
        }
      } else {
        methods.resetField('clientSnapshot')
        methods.resetField('deliveryAddress')
        methods.resetField('deliveryAddressId')
      }
    },
    [methods, isEditing, initialOrderData],
  )

  const handleAddressSelect = useCallback(
    (address: IAddress | null) => {
      setSelectedAddress(address)
      if (address) {
        methods.setValue('deliveryAddress', { ...address })
        methods.setValue('deliveryAddressId', address._id)
      } else {
        methods.resetField('deliveryAddress')
        methods.resetField('deliveryAddressId')
      }
    },
    [methods],
  )

  const prepareSubmissionData = async (data: CreateOrderInput) => {
    const enrichedData = { ...data }
    enrichedData.distanceInKm = selectedAddress?.distanceInKm || 0
    enrichedData.travelTimeInMinutes = selectedAddress?.travelTimeInMinutes || 0

    const finalShippingCost =
      selectedAddress?.distanceInKm && enrichedData.estimatedVehicleType
        ? await calculateShippingCost(
            enrichedData.estimatedVehicleType,
            selectedAddress.distanceInKm,
          )
        : 0
    enrichedData.recommendedShippingCost = round2(finalShippingCost)
    return enrichedData
  }

  const onSubmit = async (data: CreateOrderInput) => {
    const isConfrmationAction =
      !isEditing || (initialOrderData && initialOrderData.status !== 'DRAFT')

    if (isConfrmationAction && !validateClientStatus()) {
      return
    }

    setIsSubmitting(true)
    try {
      const finalData = await prepareSubmissionData(data)

      let result
      let orderIdForRedirect: string

      if (isEditing && initialOrderData) {
        // --- Logică Editare ---
        result = await updateOrder(initialOrderData._id, finalData)
        orderIdForRedirect = initialOrderData._id
      } else {
        // --- Logică Creare ---
        result = await createOrder(finalData, 'CONFIRMED')
        // Salvăm ID-ul nou creat (dacă a reușit)
        orderIdForRedirect = result.data?._id
      }

      if (result.success && orderIdForRedirect) {
        toast.success(result.message)
        router.push(`/deliveries/new?orderId=${orderIdForRedirect}`)
      } else {
        toast.error(result.message || 'A apărut o eroare necunoscută.')
      }
    } catch (error) {
      console.error('Unexpected error during form submission:', error)
      const message =
        error instanceof Error ? error.message : 'Vă rugăm să reîncercați.'
      toast.error('Eroare neașteptată', { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // onSaveDraft
  const onSaveDraft = async () => {
    if (!isEditing) {
      setIsSubmitting(true)
      try {
        const data = methods.getValues()
        const finalData = await prepareSubmissionData(data as CreateOrderInput)
        const result = await createOrder(finalData, 'DRAFT')
        if (result.success) {
          toast.success(result.message)
          router.push('/orders')
        } else {
          toast.error('Eroare la salvarea ciornei', {
            description: result.message,
          })
        }
      } catch {
        toast.error('Eroare neașteptată', {
          description: 'Vă rugăm să reîncercați.',
        })
      } finally {
        setIsSubmitting(false)
      }
    } else {
      toast.info('Salvarea ca draft nu este disponibilă în modul editare.')
    }
  }

  const validateClientStatus = (): boolean => {
    if (!selectedClient) return true
    const isBlocked = selectedClient.summary?.isBlocked

    if (isBlocked) {
      if (isAdmin) {
        toast.warning('Clientul are livrările sistate!', {
          description: 'Fiind admin, puteți continua.',
          duration: 5000,
        })
        return true
      } else {
        toast.error('Acțiune Blocată', {
          description:
            'Clientul are livrările sistate. Nu puteți confirma comanda. Salvati ca draft si contactati un admin pentru confirmare.',
        })
        return false
      }
    }
    return true
  }

  // --- Funcție Confirmare Draft -> Confirmat ---
  const onConfirmDraft = async () => {
    if (!initialOrderData) return
    if (!validateClientStatus()) return

    setIsSubmitting(true)
    try {
      // 1. Salvăm datele curente din formular
      const data = methods.getValues()
      const finalData = await prepareSubmissionData(data as CreateOrderInput)

      // Facem update preliminar
      const updateResult = await updateOrder(initialOrderData._id, finalData)

      if (!updateResult.success) {
        throw new Error(
          updateResult.message || 'Eroare la salvarea preliminară.',
        )
      }

      const confirmResult = await confirmOrder(initialOrderData._id)

      if (confirmResult.success) {
        toast.success(confirmResult.message)
        router.push(`/deliveries/new?orderId=${initialOrderData._id}`)
      } else {
        toast.error('Eroare la finalizare:', {
          description: confirmResult.message,
        })
      }
    } catch (error) {
      console.error(error)
      const msg = error instanceof Error ? error.message : 'Eroare neașteptată'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData || isClientLoading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <p>Se încarcă formularul...</p>
      </div>
    )
  }
  if (!initialDataForm) {
    return (
      <div className='p-4 text-center text-destructive'>
        <h1>Eroare</h1>
        <p>
          Datele necesare pentru formular nu au putut fi încărcate. Vă rugăm
          reîncercați.
        </p>
      </div>
    )
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className='space-y-6'>
        <h1 className='text-2xl font-bold'>
          {isEditing
            ? `Modificare Comandă #${initialOrderData?.orderNumber}`
            : 'Creare Comandă Nouă'}
        </h1>
        <div className='grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr_auto] gap-4 p-4 border rounded-lg'>
          {/* Coloana 1 */}
          <div className='p-4 border rounded-lg flex flex-col space-y-4'>
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
          {/* Coloana 2 */}
          <div className='p-4 border rounded-lg flex flex-col'>
            <h2 className='text-lg font-semibold mb-2'>Detalii Logistice</h2>
            <OrderLogistics shippingRates={initialDataForm.shippingRates} />
          </div>
          {/* Coloana 3 */}
          <div className='p-4 border rounded-lg flex flex-col'>
            <h2 className='text-lg font-semibold mb-2'>Mențiuni</h2>
            <Textarea
              {...methods.register('notes')}
              placeholder='Adaugă notițe...'
              className='flex-grow h-full min-h-[100px]'
            />
          </div>
          {/* Coloana 4 */}
          <OrderTotals />
        </div>
        {/* Manager Articole */}
        <div className='p-4 border rounded-lg'>
          <h2 className='hidden'>Articole Comandă</h2>
          <OrderItemsManager
            isAdmin={isAdmin}
            vatRates={initialDataForm.vatRates}
            services={initialDataForm.services}
            permits={initialDataForm.permits}
          />
        </div>
        {/* Butoane */}
        <div className='flex justify-end gap-4'>
          {!isEditing && (
            <Button
              type='button'
              variant='outline'
              onClick={onSaveDraft}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Se salvează...' : 'Salvează Ciornă'}
            </Button>
          )}

          {isEditing && initialOrderData?.status === 'DRAFT' && (
            <Button
              type='button'
              className='bg-green-600 hover:bg-green-700 text-white'
              onClick={onConfirmDraft}
              disabled={isSubmitting}
            >
              Finalizează Comanda
            </Button>
          )}

          <Button
            type='submit'
            disabled={isSubmitting || isLoadingData || isClientLoading}
          >
            {isSubmitting
              ? 'Se salvează...'
              : isEditing
                ? 'Actualizează Comanda'
                : 'Confirmă și Salvează Comanda'}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
