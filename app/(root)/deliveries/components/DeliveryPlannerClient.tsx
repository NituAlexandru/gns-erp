'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { PopulatedOrder } from '@/lib/db/modules/order/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Loader2, ListPlus, Boxes } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'
import {
  createSingleDelivery,
  deleteDeliveryPlan,
} from '@/lib/db/modules/deliveries/delivery.actions'
import {
  IDelivery,
  IDeliveryLineItem,
} from '@/lib/db/modules/deliveries/delivery.model'
import { DeliveryHeader } from './new/DeliveryHeader'
import { DeliveryItemsAllocator } from './new/DeliveryItemsAllocator'
import { PlannedDeliveriesList } from './new/PlannedDeliveriesList'
import {
  PackagingOption,
  PlannerItem,
  PlannedDelivery,
  HeaderInput,
} from '@/lib/db/modules/deliveries/types'
import { HeaderSchema } from '@/lib/db/modules/deliveries/validator'
import { EditDeliveryModal } from './new/EditDeliveryModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ABLY_API_ENDPOINTS,
  ABLY_CHANNELS,
  ABLY_EVENTS,
} from '@/lib/db/modules/ably/constants'

// --- Funcții Helper  ---
function mapOrderItemsToPlannerItems(
  orderItems: PopulatedOrder['lineItems'],
  existingDeliveries: IDelivery[]
): PlannerItem[] {
  const plannedQuantitiesMap = new Map<string, number>()
  existingDeliveries.forEach((delivery) => {
    if (delivery.status === 'CANCELLED') {
      return
    }

    if (!Array.isArray(delivery.items)) {
      return
    }
    delivery.items.forEach((line: IDeliveryLineItem) => {
      const lineIdStr = line.orderLineItemId?.toString()
      const qtyBase = line.quantityInBaseUnit ?? line.quantity ?? 0
      if (lineIdStr && typeof qtyBase === 'number' && qtyBase >= 0) {
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
    deliveryNumber: dbDelivery.deliveryNumber,
    status: dbDelivery.status,
    requestedDeliveryDate: new Date(dbDelivery.requestedDeliveryDate),
    requestedDeliverySlots: dbDelivery.requestedDeliverySlots,
    deliveryDate: dbDelivery.deliveryDate
      ? new Date(dbDelivery.deliveryDate)
      : undefined,
    deliverySlots: dbDelivery.deliverySlots || undefined,
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
// --- Sfârșit Funcții Helper ---

interface DeliveryPlannerClientProps {
  order: PopulatedOrder
  existingDeliveries: IDelivery[]
}

export function DeliveryPlannerClient({
  order,
  existingDeliveries,
}: DeliveryPlannerClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deliveryToEdit, setDeliveryToEdit] = useState<PlannedDelivery | null>(
    null
  )
  const [deliveryToDeleteId, setDeliveryToDeleteId] = useState<string | null>(
    null
  )
  const handleEditDelivery = (delivery: PlannedDelivery) => {
    setDeliveryToEdit(delivery)
    setIsModalOpen(true)
  }

  const [plannerItems, setPlannerItems] = useState<PlannerItem[]>(() =>
    mapOrderItemsToPlannerItems(
      order.lineItems,
      existingDeliveries as IDelivery[]
    )
  )
  const [plannedDeliveries, setPlannedDeliveries] = useState<PlannedDelivery[]>(
    () => mapDbDeliveriesToPlannedDeliveries(existingDeliveries as IDelivery[])
  )

  useEffect(() => {
    setPlannerItems(
      mapOrderItemsToPlannerItems(
        order.lineItems,
        existingDeliveries as IDelivery[]
      )
    )
    setPlannedDeliveries(
      mapDbDeliveriesToPlannedDeliveries(existingDeliveries as IDelivery[])
    )
  }, [order.lineItems, existingDeliveries])

  const methods = useForm<HeaderInput>({
    resolver: zodResolver(HeaderSchema),
    defaultValues: {
      requestedDeliveryDate: new Date(),
      requestedDeliverySlots: [],
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

  const handleAddToPlanning = async () => {
    const headerData = methods.getValues()
    const validationResult = HeaderSchema.safeParse(headerData)
    if (!validationResult.success) {
      toast.error('Completează Datași cel puțin un Interval Orar.', {
        description: validationResult.error.errors[0].message,
      })
      return
    }
    const {
      requestedDeliveryDate,
      requestedDeliverySlots,
      deliveryNotes,
      uitCode,
    } = validationResult.data

    // 👇 FIXUL DE PRÂNZ 👇
    const safeDate = new Date(requestedDeliveryDate)
    safeDate.setHours(12, 0, 0, 0)
    // ☝️

    const itemsToPlan = plannerItems.filter(
      (item) => item.quantityToAllocate > 0
    )
    if (itemsToPlan.length === 0) {
      toast.error('Introdu o cantitate (> 0) pentru cel puțin un articol.')
      return
    }

    const newPlannedDelivery: PlannedDelivery = {
      id: uuidv4(),
      requestedDeliveryDate: safeDate,
      requestedDeliverySlots: requestedDeliverySlots,
      deliveryDate: undefined,
      deliverySlots: undefined,
      items: itemsToPlan,
      deliveryNotes: deliveryNotes || undefined,
      uitCode: uitCode || undefined,
      status: 'CREATED',
    }

    startTransition(async () => {
      try {
        const result = await createSingleDelivery(
          order._id.toString(),
          newPlannedDelivery
        )
        if (result.success) {
          toast.success(result.message)
          methods.reset({
            requestedDeliveryDate: new Date(),
            requestedDeliverySlots: [],
            deliveryNotes: '',
            uitCode: '',
          })
          router.refresh()

          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: ABLY_CHANNELS.PLANNER,
                  event: ABLY_EVENTS.DATA_CHANGED,
                  data: {
                    message: `Livrare nouă creată pentru comanda ${order.orderNumber}.`, // Poți trimite și result.data (noua livrare) dacă e nevoie
                  },
                }),
              }
            )
          } catch (ablyError) {
            console.error('Ably fetch trigger error (create):', ablyError)
          }
        } else {
          toast.error('Eroare la creare:', { description: result.message }) // Folosit
        }
      } catch (error) {
        toast.error('Eroare neașteptată la salvare.')
        console.error(error)
      }
    })
  }

  const handleDeliverAll = async () => {
    const headerData = methods.getValues()
    const validationResult = HeaderSchema.safeParse(headerData)
    if (!validationResult.success) {
      toast.error('Completează Data și cel puțin un Interval Orar.', {
        description: validationResult.error.errors[0].message,
      })
      return
    }
    const {
      requestedDeliveryDate,
      requestedDeliverySlots,
      deliveryNotes,
      uitCode,
    } = validationResult.data

    // 👇 FIXUL DE PRÂNZ 👇
    const safeDate = new Date(requestedDeliveryDate)
    safeDate.setHours(12, 0, 0, 0)
    // ☝️

    let totalAllocatedBase = 0
    const itemsToPlan = plannerItems
      .map((item) => {
        const remainingInBaseUnit =
          item.quantityOrdered -
          item.quantityAlreadyShipped -
          item.quantityAlreadyPlanned
        if (remainingInBaseUnit <= 0.001) return null
        const allUnits = [
          { unitName: item.baseUnit, baseUnitEquivalent: 1 },
          ...item.packagingOptions,
        ]
        const unitInfo = allUnits.find(
          (u) => u.unitName === item.unitOfMeasure
        ) || { baseUnitEquivalent: 1 }
        const factor = unitInfo.baseUnitEquivalent || 1
        const remainingInSelectedUnit = remainingInBaseUnit / factor
        totalAllocatedBase += remainingInBaseUnit
        return {
          ...item,
          quantityToAllocate: parseFloat(remainingInSelectedUnit.toFixed(2)),
        }
      })
      .filter(Boolean) as PlannerItem[]

    if (itemsToPlan.length === 0 || totalAllocatedBase <= 0) {
      toast.error('Toate articolele au fost deja planificate integral.')
      return
    }

    const newPlannedDelivery: PlannedDelivery = {
      id: uuidv4(),
      requestedDeliveryDate: safeDate,
      requestedDeliverySlots: requestedDeliverySlots,
      deliveryDate: undefined,
      deliverySlots: undefined,
      items: itemsToPlan,
      deliveryNotes: deliveryNotes || undefined,
      uitCode: uitCode || undefined,
      status: 'CREATED',
    }

    startTransition(async () => {
      try {
        const result = await createSingleDelivery(
          order._id.toString(),
          newPlannedDelivery
        )
        if (result.success) {
          toast.success(result.message)
          methods.reset({
            requestedDeliveryDate: new Date(),
            requestedDeliverySlots: [],
            deliveryNotes: '',
            uitCode: '',
          })
          router.refresh()

          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: ABLY_CHANNELS.PLANNER,
                  event: ABLY_EVENTS.DATA_CHANGED,
                  data: {
                    message: `Livrare "Livrează Tot" creată pentru ${order.orderNumber}.`,
                  },
                }),
              }
            )
          } catch (ablyError) {
            console.error('Ably fetch trigger error (deliverAll):', ablyError)
          }
        } else {
          toast.error('Eroare la creare:', { description: result.message }) // Folosit
        }
      } catch (error) {
        toast.error('Eroare neașteptată la salvare.')
        console.error(error)
      }
    })
  }

  const handleRemovePlannedDelivery = (deliveryId: string) => {
    const deliveryToRemove = plannedDeliveries.find((d) => d.id === deliveryId)
    if (!deliveryToRemove) return

    if (deliveryToRemove.status !== 'CREATED') {
      toast.error('Acțiune Interzisă', {
        description: `Nu poți șterge o livrare cu statusul "${deliveryToRemove.status}".`,
      })
      return
    }

    setDeliveryToDeleteId(deliveryId)
  }
  const onConfirmDelete = () => {
    if (!deliveryToDeleteId) return

    startTransition(async () => {
      try {
        const result = await deleteDeliveryPlan(deliveryToDeleteId) // Folosim ID-ul din stare
        if (result.success) {
          toast.success(result.message)
          router.refresh()

          try {
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}${ABLY_API_ENDPOINTS.PUBLISH}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: ABLY_CHANNELS.PLANNER,
                  event: ABLY_EVENTS.DATA_CHANGED,
                  data: {
                    message: `Livrare ${deliveryToDelete?.deliveryNumber} a fost anulată.`,
                    deliveryId: deliveryToDeleteId,
                    newStatus: 'CANCELLED',
                  },
                }),
              }
            )
          } catch (ablyError) {
            console.error('Ably fetch trigger error (delete):', ablyError)
          }
        } else {
          toast.error('Eroare la ștergere:', { description: result.message })
        }
      } catch (error) {
        toast.error('Eroare neașteptată la ștergere.')
        console.error(error)
      } finally {
        setDeliveryToDeleteId(null)
      }
    })
  }

  const deliveryToDelete = useMemo(() => {
    if (!deliveryToDeleteId) return null
    return plannedDeliveries.find((d) => d.id === deliveryToDeleteId) ?? null
  }, [deliveryToDeleteId, plannedDeliveries])

  const deliveryIndex = deliveryToDelete
    ? plannedDeliveries.indexOf(deliveryToDelete) + 1
    : ''

  const totalRemaining = useMemo(() => {
    return plannerItems.reduce((acc, item) => {
      const remaining =
        item.quantityOrdered -
        item.quantityAlreadyShipped -
        item.quantityAlreadyPlanned
      return acc + (remaining > 0.0001 ? remaining : 0)
    }, 0)
  }, [plannerItems])
  const allItemsPlanned = totalRemaining < 0.0001

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold'>
          Planificare Livrări Comanda #{order.orderNumber}
        </h1>

        <div className='flex gap-2'>
          <Button asChild variant='outline' type='button'>
            <Link href='/deliveries'>Programează Livrare</Link>
          </Button>
          <Button asChild variant='outline' type='button'>
            <Link href={`/orders/${order._id}`}>Înapoi La Comanda</Link>
          </Button>
          <Button asChild variant='outline' type='button'>
            <Link href='/orders/new'>Comandă Nouă</Link>
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
              disabled={allItemsPlanned || isPending}
            >
              {isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Boxes className='mr-2 h-4 w-4' />
              )}
              Livrează Tot
            </Button>

            <Button
              type='button'
              className='w-[49%]'
              onClick={handleAddToPlanning}
              size='lg'
              disabled={allItemsPlanned || isPending}
            >
              {isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <ListPlus className='mr-2 h-5 w-5' />
              )}

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
            onEditDelivery={handleEditDelivery}
          />
        </div>
      </div>
      <EditDeliveryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deliveryToEdit={deliveryToEdit}
        currentPlannerItems={plannerItems}
      />
      <AlertDialog
        open={!!deliveryToDeleteId}
        onOpenChange={(open) => {
          if (!open) setDeliveryToDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare Anulare Livrarii</AlertDialogTitle>
            <AlertDialogDescription>
              Ești sigur că vrei să ștergi{' '}
              <strong>
                Livrarea {deliveryToDelete?.deliveryNumber || deliveryIndex}?
              </strong>
              <br />
              Această acțiune este ireversibilă și va elibera articolele înapoi
              în comandă.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} disabled={isPending}>
              {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Confirmă Anularea
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
