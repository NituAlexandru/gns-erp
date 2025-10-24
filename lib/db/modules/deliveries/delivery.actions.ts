'use server'

import { connectToDatabase } from '@/lib/db'
import mongoose, { Types, ClientSession } from 'mongoose'
import { revalidatePath } from 'next/cache'
import { formatError, round2 } from '@/lib/utils'
import { auth } from '@/auth'
import DeliveryModel, { IDelivery } from './delivery.model'
import OrderModel, { IOrder } from '../order/order.model'
import {
  IOrderLineItem,
  NewDeliveryData,
  NewDeliveryLineData,
  DeliveryDataForInsert,
  PlannerItem,
  PlannedDelivery,
} from './types'
import { DELIVERY_SLOTS } from './constants'

function buildDeliveryLine(
  item: PlannerItem,
  originalLine: IOrderLineItem
): NewDeliveryLineData {
  const allUnits = [
    { unitName: item.baseUnit, baseUnitEquivalent: 1 },
    ...(item.packagingOptions || []),
  ]
  const unitInfo = allUnits.find((u) => u.unitName === item.unitOfMeasure)
  const conversionFactor = unitInfo?.baseUnitEquivalent || 1
  const quantityInBaseUnit = round2(item.quantityToAllocate * conversionFactor)
  const basePrice =
    originalLine.priceInBaseUnit ?? originalLine.priceAtTimeOfOrder
  const lineValue = round2(basePrice * quantityInBaseUnit)
  const lineVatValue = round2(
    lineValue * (originalLine.vatRateDetails.rate / 100)
  )
  const lineTotal = round2(lineValue + lineVatValue)
  const productCodeValue = originalLine.productCode
    ? originalLine.productCode.trim()
    : 'N/A'
  const lineData: NewDeliveryLineData = {
    orderLineItemId: item.orderLineItemId
      ? new Types.ObjectId(item.orderLineItemId)
      : undefined,
    productId: originalLine.productId,
    serviceId: originalLine.serviceId,
    isManualEntry: false,
    isPerDelivery: originalLine.isPerDelivery,
    productName: originalLine.productName,
    productCode: productCodeValue,
    quantity: item.quantityToAllocate,
    unitOfMeasure: item.unitOfMeasure,
    unitOfMeasureCode: item.unitOfMeasureCode ?? undefined,
    priceAtTimeOfOrder: originalLine.priceAtTimeOfOrder,
    minimumSalePrice: originalLine.minimumSalePrice,
    baseUnit: originalLine.baseUnit,
    conversionFactor: conversionFactor,
    quantityInBaseUnit: quantityInBaseUnit,
    priceInBaseUnit: originalLine.priceInBaseUnit,
    packagingOptions: originalLine.packagingOptions ?? [],
    stockableItemType: originalLine.stockableItemType,
    lineValue: lineValue,
    lineVatValue: lineVatValue,
    lineTotal: lineTotal,
    vatRateDetails: {
      rate: originalLine.vatRateDetails.rate,
      value: lineVatValue,
    },
  }
  return lineData
}

function calculateDeliveryTotals(
  deliveryLines: NewDeliveryLineData[]
): IDelivery['totals'] {
  const totals: IDelivery['totals'] = {
    productsSubtotal: 0,
    servicesSubtotal: 0,
    manualSubtotal: 0,
    productsVat: 0,
    servicesVat: 0,
    manualVat: 0,
    subtotal: 0,
    vatTotal: 0,
    grandTotal: 0,
  }
  for (const line of deliveryLines) {
    totals.subtotal += line.lineValue
    totals.vatTotal += line.lineVatValue
    if (line.stockableItemType) {
      totals.productsSubtotal += line.lineValue
      totals.productsVat += line.lineVatValue
    } else {
      totals.servicesSubtotal += line.lineValue
      totals.servicesVat += line.lineVatValue
    }
  }
  totals.grandTotal = round2(totals.subtotal + totals.vatTotal)
  Object.keys(totals).forEach((key) => {
    totals[key as keyof IDelivery['totals']] = round2(
      totals[key as keyof IDelivery['totals']]
    )
  })
  return totals
}

function createSingleDeliveryDocument(
  plan: PlannedDelivery,
  originalOrder: IOrder,
  originalLinesMap: Map<string, IOrderLineItem>,
  user: { id: string; name: string }
): NewDeliveryData {
  const deliveryLinesData = plan.items.map((item) => {
    const originalLine = originalLinesMap.get(item.orderLineItemId!)
    if (!originalLine)
      throw new Error(
        `Integrity Error: Original line ${item.orderLineItemId} not found.`
      )
    return buildDeliveryLine(item, originalLine)
  })
  const deliveryTotals = calculateDeliveryTotals(deliveryLinesData)
  const deliverySlotTyped = plan.deliverySlot as (typeof DELIVERY_SLOTS)[number]
  if (!originalOrder.deliveryAddressId)
    throw new Error(`Comanda ${originalOrder.orderNumber} nu are ID adresă.`)

  const deliveryData: NewDeliveryData = {
    deliveryDate: plan.deliveryDate,
    deliverySlot: deliverySlotTyped,
    vehicleType: originalOrder.estimatedVehicleType || 'N/A',
    createdBy: new Types.ObjectId(user.id),
    createdByName: user.name,
    orderId: new Types.ObjectId(originalOrder._id),
    orderNumber: originalOrder.orderNumber,
    client: new Types.ObjectId(originalOrder.client),
    clientSnapshot: originalOrder.clientSnapshot,
    salesAgent: new Types.ObjectId(originalOrder.salesAgent),
    salesAgentSnapshot: originalOrder.salesAgentSnapshot,
    deliveryAddress: originalOrder.deliveryAddress,
    deliveryAddressId: new Types.ObjectId(originalOrder.deliveryAddressId),
    items: deliveryLinesData,
    totals: deliveryTotals,
    deliveryNotes: plan.deliveryNotes,
    orderNotes: originalOrder.notes,
    uitCode: plan.uitCode,
  }
  return deliveryData
}

// --- Funcția Principală
export async function createDeliveryPlans(
  orderId: string,
  plannedDeliveries: PlannedDelivery[]
) {
  const mongoSession = await mongoose.startSession()
  try {
    await connectToDatabase()
    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')
    const user = { id: authSession.user.id, name: authSession.user.name }
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId))
      throw new Error('ID Comandă invalid.')

    const originalOrder: IOrder | null =
      await OrderModel.findById(orderId).lean<IOrder>()
    if (!originalOrder) throw new Error('Comanda sursă nu a fost găsită.')

    const originalLinesMap = new Map<string, IOrderLineItem>(
      originalOrder.lineItems.map((line: IOrderLineItem) => [
        line._id.toString(),
        line,
      ])
    )

    // Construim datele pentru livrările trimise de client
    const deliveriesToCreate: NewDeliveryData[] = plannedDeliveries.map(
      (plan) =>
        createSingleDeliveryDocument(
          plan,
          originalOrder,
          originalLinesMap,
          user
        )
    )

    let savedDeliveries: IDelivery[] = []
    await mongoSession.withTransaction(
      async (transactionSession: ClientSession) => {
        // Ștergem livrările vechi
        console.log(`Ștergere livrări existente pentru comanda ${orderId}`)
        await DeliveryModel.deleteMany(
          { orderId: new Types.ObjectId(orderId) },
          { session: transactionSession }
        )

        // Inserăm livrările noi (dacă există)
        const deliveriesForInsert: DeliveryDataForInsert[] = []
        if (deliveriesToCreate.length > 0) {
          deliveriesToCreate.forEach((data, i) => {
            // Noul format: NumarComanda-IndexBazatPe1 (ex: 202510230033-1, 202510230033-2)
            const deliveryNumber = `${originalOrder.orderNumber}-${i + 1}`
            deliveriesForInsert.push({
              ...data,
              deliveryNumber: deliveryNumber,
            })
          })
          savedDeliveries = await DeliveryModel.insertMany(
            deliveriesForInsert,
            { session: transactionSession }
          )
          if (savedDeliveries.length !== deliveriesForInsert.length)
            throw new Error('Nu s-au salvat toate livrările.')
        } else {
          console.log(`Nicio livrare nouă de creat pentru ${orderId}.`)
          savedDeliveries = []
        }

        // Actualizăm statusul comenzii
        const newOrderStatus =
          savedDeliveries.length > 0 ? 'SCHEDULED' : 'CONFIRMED'
        console.log(
          `Actualizare status comandă ${orderId} la ${newOrderStatus}`
        )
        await OrderModel.findByIdAndUpdate(
          orderId,
          { $set: { status: newOrderStatus } },
          { session: transactionSession }
        )
      }
    )

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/deliveries')
    const message =
      savedDeliveries.length > 0
        ? `${savedDeliveries.length} livrări planificate/actualizate.`
        : `Livrări existente șterse.`
    return { success: true, message: message }
  } catch (error) {
    console.error(
      'Eroare detaliată la crearea/actualizarea planificărilor:',
      error
    )
    return {
      success: false,
      message: formatError(error) || 'Eroare la salvarea planificărilor.',
    }
  } finally {
    await mongoSession.endSession()
  }
}

/** Preia livrările asociate unei comenzi */
export async function getDeliveriesByOrderId(
  orderId: string
): Promise<IDelivery[]> {
  try {
    await connectToDatabase()
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) return []
    const deliveries = await DeliveryModel.find({
      orderId: new Types.ObjectId(orderId),
    })
      .sort({ createdAt: 1 })
      .lean<IDelivery[]>()
    return deliveries
  } catch (error) {
    console.error(`Eroare preluare livrări pt comanda ${orderId}:`, error)
    return []
  }
}
