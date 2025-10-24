'use client'

import { useState, useMemo } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PopulatedOrder } from '@/lib/db/modules/order/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Loader2, ListPlus, Send, Boxes } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'
import { createDeliveryPlans } from '@/lib/db/modules/deliveries/delivery.actions'
import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { DeliveryHeader } from './DeliveryHeader'
import { DeliveryItemsAllocator } from './DeliveryItemsAllocator'
import { PlannedDeliveriesList } from './PlannedDeliveriesList'
import {
  PackagingOption,
  PlannerItem,
  PlannedDelivery,
  HeaderInput,
} from '@/lib/db/modules/deliveries/types'
import { HeaderSchema } from '@/lib/db/modules/deliveries/validator'

// --- Funcții Helper ---
function mapOrderItemsToPlannerItems(
  orderItems: PopulatedOrder['lineItems'],
  existingDeliveries: IDelivery[]
): PlannerItem[] {
  const plannedQuantitiesMap = new Map<string, number>()
  existingDeliveries.forEach((delivery) => {
    if (!Array.isArray(delivery.items)) {
      return
    } // Skip
    delivery.items.forEach((line: IDeliveryLineItem) => {
      const lineIdStr = line.orderLineItemId
      const qtyBase = line.quantityInBaseUnit ?? line.quantity ?? 0
      if (
        lineIdStr &&
        typeof lineIdStr === 'string' &&
        typeof qtyBase === 'number' &&
        qtyBase >= 0
      ) {
        const currentPlanned = plannedQuantitiesMap.get(lineIdStr) || 0
        plannedQuantitiesMap.set(lineIdStr, currentPlanned + qtyBase)
      }
    })
  })

  return orderItems.map((item) => {
    const orderLineIdStr = item._id.toString().trim()
    const qtyOrdered = item.quantityInBaseUnit ?? item.quantity ?? 0
    const qtyShipped = item.quantityShipped ?? 0
    const qtyPlanned = plannedQuantitiesMap.get(orderLineIdStr) || 0

    const baseUnit = item.baseUnit || item.unitOfMeasure
    const vatRate = item.vatRateDetails?.rate ?? 0
    const priceAtOrder = item.priceAtTimeOfOrder ?? 0
    const priceBase = item.priceInBaseUnit ?? priceAtOrder

    const plannerItem: PlannerItem = {
      id: orderLineIdStr,
      orderLineItemId: orderLineIdStr,
      productId: item.productId?.toString() || null,
      serviceId: item.serviceId?.toString() || null,
      stockableItemType: item.stockableItemType || null,
      productName: item.productName || 'N/A',
      productCode: item.productCode || null,
      isManualEntry: false,
      quantityOrdered: qtyOrdered,
      quantityAlreadyShipped: qtyShipped,
      quantityAlreadyPlanned: qtyPlanned,
      unitOfMeasure: item.unitOfMeasure || 'bucata',
      unitOfMeasureCode: item.unitOfMeasureCode || null,
      baseUnit: baseUnit || 'bucata',
      packagingOptions: (item.packagingOptions as PackagingOption[]) || [],
      quantityToAllocate: 0,
      priceAtTimeOfOrder: priceAtOrder,
      priceInBaseUnit: priceBase,
      vatRateDetails: { rate: vatRate },
    }
    return plannerItem
  })
}

function mapDbDeliveriesToPlannedDeliveries(
  dbDeliveries: IDelivery[]
): PlannedDelivery[] {
  return dbDeliveries.map((dbDelivery) => ({
    id: dbDelivery._id.toString(),
    deliveryDate: new Date(dbDelivery.deliveryDate),
    deliverySlot: dbDelivery.deliverySlot,
    deliveryNotes: dbDelivery.deliveryNotes || undefined,
    uitCode: dbDelivery.uitCode || undefined,
    items: dbDelivery.items.map((dbLine: IDeliveryLineItem) => ({
      id: dbLine.orderLineItemId
        ? dbLine.orderLineItemId.toString()
        : `manual_db_${dbLine._id.toString()}`,
      orderLineItemId: dbLine.orderLineItemId?.toString() || null,
      productId: dbLine.productId?.toString() || null,
      serviceId: dbLine.serviceId?.toString() || null,
      stockableItemType: dbLine.stockableItemType || null,
      productName: dbLine.productName || 'N/A',
      productCode: dbLine.productCode || null,
      isManualEntry: dbLine.isManualEntry,
      quantityOrdered: 0,
      quantityAlreadyShipped: 0,
      quantityAlreadyPlanned: 0,
      unitOfMeasure: dbLine.unitOfMeasure || 'bucata',
      unitOfMeasureCode: dbLine.unitOfMeasureCode || null,
      baseUnit: dbLine.baseUnit || dbLine.unitOfMeasure || 'bucata',
      packagingOptions: (dbLine.packagingOptions as PackagingOption[]) || [],
      quantityToAllocate: dbLine.quantity || 0,
      priceAtTimeOfOrder: dbLine.priceAtTimeOfOrder || 0,
      priceInBaseUnit: dbLine.priceInBaseUnit || dbLine.priceAtTimeOfOrder || 0,
      vatRateDetails: { rate: dbLine.vatRateDetails?.rate ?? 0 },
    })),
  }))
}

interface DeliveryPlannerClientProps {
  order: PopulatedOrder
  existingDeliveries: IDelivery[]
}

export function DeliveryPlannerClient({
  order,
  existingDeliveries,
}: DeliveryPlannerClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>(() =>
    mapOrderItemsToPlannerItems(
      order.lineItems,
      existingDeliveries as IDelivery[]
    )
  )
  const [plannedDeliveries, setPlannedDeliveries] = useState<PlannedDelivery[]>(
    () => mapDbDeliveriesToPlannedDeliveries(existingDeliveries as IDelivery[]) // Cast necesar
  )
  const methods = useForm<HeaderInput>({
    resolver: zodResolver(HeaderSchema),
    defaultValues: {
      deliveryDate: new Date(),
      deliveryNotes: '',
      uitCode: '',
    },
  })
  const handleItemChange = (itemId: string, updates: Partial<PlannerItem>) => {
    setPlannerItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    )
  }

  const handleAddToPlanning = () => {
    const headerData = methods.getValues()
    const validationResult = HeaderSchema.safeParse(headerData)
    if (!validationResult.success) {
      toast.error('Completează Data și Intervalul Orar.', {
        description: validationResult.error.errors[0].message,
      })
      return
    }
    const { deliveryDate, deliverySlot, deliveryNotes, uitCode } =
      validationResult.data
    const itemsToPlan = plannerItems.filter(
      (item) => item.quantityToAllocate > 0
    )
    if (itemsToPlan.length === 0) {
      toast.error('Introdu o cantitate (> 0) pentru cel puțin un articol.')
      return
    }

    const newPlannedDelivery: PlannedDelivery = {
      id: uuidv4(),
      deliveryDate,
      deliverySlot,
      items: itemsToPlan,
      deliveryNotes: deliveryNotes || undefined,
      uitCode: uitCode || undefined,
    }
    setPlannedDeliveries((prev) => [...prev, newPlannedDelivery])

    setPlannerItems((currentItems) =>
      currentItems.map((item) => {
        const plannedItem = itemsToPlan.find((p) => p.id === item.id)
        if (!plannedItem) return item
        const allUnits = [
          { unitName: item.baseUnit, baseUnitEquivalent: 1 },
          ...item.packagingOptions,
        ]
        const unitInfo = allUnits.find(
          (u) => u.unitName === plannedItem.unitOfMeasure
        )
        const factor = unitInfo?.baseUnitEquivalent || 1
        const allocatedBase = plannedItem.quantityToAllocate * factor
        return {
          ...item,
          quantityAlreadyPlanned: item.quantityAlreadyPlanned + allocatedBase,
          quantityToAllocate: 0,
        }
      })
    )
    toast.success('Livrarea adăugată în planificare.') // <-- Folosim toast
    methods.resetField('deliveryDate')
    methods.resetField('deliveryNotes')
    methods.resetField('uitCode')
  }

  const handleDeliverAll = () => {
    // 1. Validăm header-ul (la fel ca la 'Adaugă')
    const headerData = methods.getValues()
    const validationResult = HeaderSchema.safeParse(headerData)
    if (!validationResult.success) {
      toast.error('Completează Data și Intervalul Orar.', {
        description: validationResult.error.errors[0].message,
      })
      return
    }
    const { deliveryDate, deliverySlot, deliveryNotes, uitCode } =
      validationResult.data

    // 2. Găsim TOATE item-urile care mai au ceva de livrat
    let totalAllocatedBase = 0
    const itemsToPlan = plannerItems
      .map((item) => {
        // Calculăm rămasul în unitatea de bază
        const remainingInBaseUnit =
          item.quantityOrdered -
          item.quantityAlreadyShipped -
          item.quantityAlreadyPlanned

        // Dacă nu mai e nimic de livrat, returnăm null
        if (remainingInBaseUnit <= 0.001) return null

        // Calculăm factorul de conversie pt UM selectată
        const allUnits = [
          { unitName: item.baseUnit, baseUnitEquivalent: 1 },
          ...item.packagingOptions,
        ]
        const unitInfo = allUnits.find(
          (u) => u.unitName === item.unitOfMeasure
        ) || { baseUnitEquivalent: 1 }
        const factor = unitInfo.baseUnitEquivalent || 1

        // Calculăm rămasul în UM selectată
        const remainingInSelectedUnit = remainingInBaseUnit / factor

        totalAllocatedBase += remainingInBaseUnit

        // Returnăm un obiect PlannerItem care reprezintă ce alocăm
        return {
          ...item,
          quantityToAllocate: parseFloat(remainingInSelectedUnit.toFixed(2)), // Alocăm tot ce a rămas
        }
      })
      .filter(Boolean) as PlannerItem[] // Filtrăm null-urile

    if (itemsToPlan.length === 0 || totalAllocatedBase <= 0) {
      toast.error('Toate articolele au fost deja planificate integral.')
      return
    }

    // 3. Creăm noul card de livrare
    const newPlannedDelivery: PlannedDelivery = {
      id: uuidv4(),
      deliveryDate,
      deliverySlot,
      items: itemsToPlan,
      deliveryNotes: deliveryNotes || undefined,
      uitCode: uitCode || undefined,
    }

    // 4. Adăugăm cardul în lista din dreapta
    setPlannedDeliveries((prev) => [...prev, newPlannedDelivery])

    // 5. Actualizăm starea din stânga (setăm totul ca planificat)
    setPlannerItems((currentItems) =>
      currentItems.map((item) => {
        const plannedItem = itemsToPlan.find((p) => p.id === item.id)
        if (!plannedItem) return item

        // Calculăm cât am alocat (tot ce a rămas)
        const remainingInBaseUnit =
          item.quantityOrdered -
          item.quantityAlreadyShipped -
          item.quantityAlreadyPlanned

        return {
          ...item,
          // Adăugăm tot restul la planificat
          quantityAlreadyPlanned:
            item.quantityAlreadyPlanned +
            (remainingInBaseUnit > 0 ? remainingInBaseUnit : 0),
          quantityToAllocate: 0, // Resetăm inputul
        }
      })
    )

    toast.success('Toate articolele rămase au fost adăugate într-o livrare.')
    // Resetăm câmpurile
    methods.resetField('deliveryDate')
    methods.resetField('deliveryNotes')
    methods.resetField('uitCode')
  }

  const handleRemovePlannedDelivery = (deliveryId: string) => {
    const deliveryToRemove = plannedDeliveries.find((d) => d.id === deliveryId)
    if (!deliveryToRemove) return
    setPlannedDeliveries((prev) => prev.filter((d) => d.id !== deliveryId))
    setPlannerItems((currentItems) =>
      currentItems.map((item) => {
        const plannedItem = deliveryToRemove.items.find((p) => p.id === item.id)
        if (!plannedItem) return item
        const allUnits = [
          { unitName: item.baseUnit, baseUnitEquivalent: 1 },
          ...item.packagingOptions,
        ]
        const unitInfo = allUnits.find(
          (u) => u.unitName === plannedItem.unitOfMeasure
        )
        const factor = unitInfo?.baseUnitEquivalent || 1
        const allocatedBase = plannedItem.quantityToAllocate * factor
        return {
          ...item,
          quantityAlreadyPlanned: item.quantityAlreadyPlanned - allocatedBase,
        }
      })
    )
    toast.warning('Livrarea eliminată din planificare.')
  }

  const totalRemaining = useMemo(
    () =>
      plannerItems.reduce((acc, item) => {
        const remaining =
          item.quantityOrdered -
          item.quantityAlreadyShipped -
          item.quantityAlreadyPlanned
        return acc + (remaining > 0.0001 ? remaining : 0)
      }, 0),
    [plannerItems]
  )
  const allItemsPlanned = totalRemaining < 0.0001

  const onFinalSubmit = async () => {
    if (plannedDeliveries.length === 0 && existingDeliveries.length === 0) {
      toast.error('Nu ai nicio livrare planificată de salvat.')
      return
    }
    if (plannedDeliveries.length === 0 && existingDeliveries.length > 0) {
      if (
        !confirm(
          'Ești sigur că vrei să ștergi toate livrările planificate anterior?'
        )
      ) {
        return
      }
    }
    setIsSubmitting(true)
    try {
      const result = await createDeliveryPlans(
        order._id.toString(),
        plannedDeliveries
      )
      if (result.success) {
        toast.success(result.message)
        router.push(`/orders/${order._id}`)
      } else {
        toast.error('Eroare la salvare:', { description: result.message }) // <-- Folosim toast
      }
    } catch (error) {
      toast.error('Eroare la salvarea planificărilor.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>
          Planificare Livrări Comanda #{order.orderNumber}
        </h1>
        <div className='flex gap-2'>
          <Button asChild variant='outline' type='button'>
            <Link href={`/orders/${order._id}`}>Înapoi</Link>
          </Button>
          <Button
            type='button'
            onClick={onFinalSubmit}
            disabled={isSubmitting}
            className='bg-red-600 hover:bg-red-700'
          >
            {isSubmitting ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Send className='mr-2 h-4 w-4' />
            )}
            {plannedDeliveries.length > 0
              ? 'Confirmă Planificările'
              : 'Confirmă Ștergerea'}
          </Button>
        </div>
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-6'>
          <FormProvider {...methods}>
            <DeliveryHeader
              clientSnapshot={order.clientSnapshot}
              deliveryAddress={order.deliveryAddress}
              vehicleType={order.estimatedVehicleType || 'N/A'}
              orderNotes={order.notes}
            />
          </FormProvider>
          <div className='flex gap-5'>
            <Button
              type='button'
              onClick={handleDeliverAll}
              className='w-[49%]'
              variant='outline'
              size='lg'
              disabled={allItemsPlanned}
            >
              <Boxes className='mr-2 h-4 w-4' />
              Livrează Tot
            </Button>

            <Button
              type='button'
              className='w-[49%]'
              onClick={handleAddToPlanning}
              size='lg'
              disabled={allItemsPlanned}
            >
              <ListPlus className='mr-2 h-5 w-5' />
              {allItemsPlanned
                ? 'Toate articolele planificate'
                : 'Adaugă la Planificare'}
            </Button>
          </div>
          <DeliveryItemsAllocator
            itemsToAllocate={plannerItems}
            onAllocationChange={handleItemChange}
          />
        </div>
        <div className='lg:col-span-1'>
          <PlannedDeliveriesList
            plannedDeliveries={plannedDeliveries}
            onRemoveDelivery={handleRemovePlannedDelivery}
          />
        </div>
      </div>
    </div>
  )
}
