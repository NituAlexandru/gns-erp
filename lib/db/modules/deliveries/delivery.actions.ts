'use server'

import { connectToDatabase } from '@/lib/db'
import mongoose, { Types } from 'mongoose'
import { revalidatePath } from 'next/cache'
import { formatError, round2 } from '@/lib/utils'
import { auth } from '@/auth'
import DeliveryModel, { IDelivery, IDeliveryLineItem } from './delivery.model'
import OrderModel, { IOrder } from '../order/order.model'
import {
  IOrderLineItem,
  NewDeliveryData,
  NewDeliveryLineData,
  DeliveryDataForInsert,
  PlannerItem,
  PlannedDelivery,
  DeliveryStatusKey,
} from './types'
import { DELIVERY_SLOTS } from './constants'
import { generateDeliveryNumber } from '../numbering/numbering.actions'

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

  if (!originalOrder.deliveryAddressId)
    throw new Error(`Comanda ${originalOrder.orderNumber} nu are ID adresă.`)

  const deliveryData: NewDeliveryData = {
    requestedDeliveryDate: plan.requestedDeliveryDate,
    requestedDeliverySlot:
      plan.requestedDeliverySlot as (typeof DELIVERY_SLOTS)[number],
    deliveryDate: plan.deliveryDate,
    deliverySlot: plan.deliverySlot as
      | (typeof DELIVERY_SLOTS)[number]
      | undefined,
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

export async function createSingleDelivery(
  orderId: string,
  plan: PlannedDelivery
) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
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

    // 1. Construim documentul de livrare
    const deliveryData = createSingleDeliveryDocument(
      plan,
      originalOrder,
      originalLinesMap,
      user
    )

    // 2. Generăm numărul de livrare folosind funcția atomică

    const deliveryNumber = await generateDeliveryNumber(
      originalOrder.orderNumber,
      { session: mongoSession }
    )

    const deliveryForInsert: DeliveryDataForInsert = {
      ...deliveryData,
      deliveryNumber: deliveryNumber,
    }

    // 3. Inserăm livrarea
    const [savedDelivery] = await DeliveryModel.insertMany(
      [deliveryForInsert],
      { session: mongoSession }
    )

    // 4. Actualizăm statusul comenzii la 'SCHEDULED' (dacă nu e deja)
    if (
      originalOrder.status !== 'SCHEDULED' &&
      originalOrder.status !== 'PARTIALLY_DELIVERED'
    ) {
      await OrderModel.findByIdAndUpdate(
        orderId,
        { $set: { status: 'SCHEDULED' } },
        { session: mongoSession }
      )
    }

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${orderId}`)
    revalidatePath('/deliveries')

    return {
      success: true,
      message: `Livrarea ${deliveryNumber} a fost creată cu succes.`,
      data: JSON.parse(JSON.stringify(savedDelivery)),
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la crearea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la salvarea livrării.',
    }
  } finally {
    await mongoSession.endSession()
  }
}

export async function deleteDeliveryPlan(deliveryId: string) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
  try {
    await connectToDatabase()

    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')

    if (!deliveryId || !mongoose.Types.ObjectId.isValid(deliveryId)) {
      throw new Error('ID Livrare invalid.')
    }

    const delivery =
      await DeliveryModel.findById(deliveryId).session(mongoSession)
    if (!delivery) {
      throw new Error('Livrarea nu a fost găsită. Poate a fost ștearsă deja.')
    }

    const cancellableStatuses: DeliveryStatusKey[] = ['CREATED', 'SCHEDULED'] // Folosim tipul corect
    if (!cancellableStatuses.includes(delivery.status)) {
      throw new Error(
        `Nu se poate anula o livrare cu statusul "${delivery.status}".`
      )
    }

    // Setăm statusul la 'CANCELLED'
    delivery.status = 'CANCELLED'
    // Salvăm și informațiile utilizatorului care a anulat
    delivery.lastUpdatedBy = new Types.ObjectId(authSession.user.id)
    delivery.lastUpdatedByName = authSession.user.name || 'Sistem'

    await delivery.save({ session: mongoSession })

    const remainingActiveDeliveries = await DeliveryModel.countDocuments({
      orderId: delivery.orderId,
      status: { $nin: ['CANCELLED'] }, // Excludem livrările anulate
    }).session(mongoSession)

    // Dacă nu mai rămâne nicio livrare activă, setăm statusul comenzii înapoi la CONFIRMED
    if (remainingActiveDeliveries === 0) {
      // Găsim comanda și verificăm statusul curent înainte de a-l schimba
      const order = await OrderModel.findById(delivery.orderId).session(
        mongoSession
      )
      // Schimbăm statusul doar dacă e 'SCHEDULED' sau 'PARTIALLY_DELIVERED'
      if (
        order &&
        (order.status === 'SCHEDULED' || order.status === 'PARTIALLY_DELIVERED')
      ) {
        await OrderModel.findByIdAndUpdate(
          delivery.orderId,
          { $set: { status: 'CONFIRMED' } },
          { session: mongoSession }
        )
      }
    }

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${delivery.orderId.toString()}`)
    revalidatePath('/deliveries')

    return { success: true, message: 'Livrarea a fost anulată cu succes.' }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la anularea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la anularea livrării.',
    }
  } finally {
    await mongoSession.endSession()
  }
}
export async function updateSingleDelivery(
  deliveryId: string,
  plan: PlannedDelivery
) {
  const mongoSession = await mongoose.startSession()
  mongoSession.startTransaction()
  try {
    await connectToDatabase()

    const authSession = await auth()
    if (!authSession?.user?.id || !authSession?.user?.name)
      throw new Error('Utilizator neautentificat.')
    const user = { id: authSession.user.id, name: authSession.user.name }

    if (!deliveryId || !mongoose.Types.ObjectId.isValid(deliveryId)) {
      throw new Error('ID Livrare invalid.')
    }

    // 1. Găsim livrarea existentă
    const delivery =
      await DeliveryModel.findById(deliveryId).session(mongoSession)
    if (!delivery) {
      throw new Error('Livrarea nu a fost găsită.')
    }

    // 2. Verificăm statusul
    const readOnlyStatuses: string[] = ['INVOICED', 'CANCELLED']
    if (readOnlyStatuses.includes(delivery.status)) {
      throw new Error(
        `Nu se poate modifica o livrare cu statusul "${delivery.status}".`
      )
    }

    // 3. Preluăm comanda originală
    const originalOrder: IOrder | null = await OrderModel.findById(
      delivery.orderId
    ).lean<IOrder>()
    if (!originalOrder) throw new Error('Comanda sursă nu a fost găsită.')

    const originalLinesMap = new Map<string, IOrderLineItem>(
      originalOrder.lineItems.map((line: IOrderLineItem) => [
        line._id.toString(),
        line,
      ])
    )

    // 4. Reconstruim datele
    const newDeliveryLinesData = plan.items.map((item) => {
      const originalLine = originalLinesMap.get(item.orderLineItemId!)
      if (!originalLine)
        throw new Error(
          `Integrity Error: Linia originală ${item.orderLineItemId} nu a fost găsită.`
        )
      return buildDeliveryLine(item, originalLine)
    })
    const newDeliveryTotals = calculateDeliveryTotals(newDeliveryLinesData)

    // 5. Actualizăm documentul de livrare
    delivery.set({
      requestedDeliveryDate: plan.requestedDeliveryDate,
      requestedDeliverySlot: plan.requestedDeliverySlot,
      deliveryNotes: plan.deliveryNotes,
      uitCode: plan.uitCode,
      deliveryDate: plan.deliveryDate,
      deliverySlot: plan.deliverySlot,
      items: newDeliveryLinesData as Types.DocumentArray<IDeliveryLineItem>,
      totals: newDeliveryTotals,
      lastUpdatedBy: new Types.ObjectId(user.id),
      lastUpdatedByName: user.name,
    })

    const savedDelivery = await delivery.save({ session: mongoSession })

    await mongoSession.commitTransaction()

    revalidatePath(`/orders/${delivery.orderId.toString()}`)
    revalidatePath('/deliveries')

    return {
      success: true,
      message: `Livrarea ${savedDelivery.deliveryNumber} a fost actualizată.`,
      data: JSON.parse(JSON.stringify(savedDelivery)),
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    console.error('Eroare la actualizarea livrării:', error)
    return {
      success: false,
      message: formatError(error) || 'Eroare la actualizarea livrării.',
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
