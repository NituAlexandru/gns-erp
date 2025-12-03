'use server'

import { revalidatePath } from 'next/cache'
import Order, { IOrder } from './order.model'
import { CreateOrderInputSchema } from './validator'
import { CreateOrderInput, PopulatedOrder } from './types'
import { connectToDatabase } from '../..'
import mongoose, { startSession, Types } from 'mongoose'
import { formatError, round2 } from '@/lib/utils'
import { reserveStock, unreserveStock } from '../inventory/inventory.actions'
import { generateOrderNumber } from '../numbering/numbering.actions'
import { auth } from '@/auth'
import z from 'zod'
import VehicleRate from '../setting/shipping-rates/shipping.model'
import { PAGE_SIZE } from '@/lib/constants'
import './../client/client.model'
import './../user/user.model'
import { getShippingRates } from '../setting/shipping-rates/shipping.actions'
import { getVatRates } from '../setting/vat-rate/vatRate.actions'
import {
  getActiveCommonServices,
  getActivePermits,
} from '../setting/services/service.actions'
import { VatRateDTO } from '../setting/vat-rate/types'
import { IOrderLineItem } from '../deliveries/types'

export async function calculateShippingCost(
  vehicleType: string,
  distanceInKm: number
): Promise<number> {
  try {
    if (!vehicleType || !distanceInKm || distanceInKm <= 0) {
      return 0
    }
    await connectToDatabase()

    const vehicleRate = await VehicleRate.findOne({ type: vehicleType })
      .select('ratePerKm')
      .lean()

    if (!vehicleRate || !vehicleRate.ratePerKm) {
      console.warn(
        `Nu a fost găsit un tarif/km pentru tipul de vehicul: ${vehicleType}`
      )
      return 0
    }

    const ratePerKm = vehicleRate.ratePerKm
    const totalCost = distanceInKm * ratePerKm
    return Math.round(totalCost * 100) / 100
  } catch (error) {
    console.error('Eroare la calcularea costului de transport:', error)
    return 0
  }
}
// Funcție ajutătoare care centralizează TOATĂ logica de calcul

function getInitialOrderTotals() {
  return {
    productsSubtotal: 0,
    productsVat: 0,
    packagingSubtotal: 0,
    packagingVat: 0,
    servicesSubtotal: 0,
    servicesVat: 0,
    manualSubtotal: 0,
    manualVat: 0,
    subtotal: 0,
    vatTotal: 0,
    grandTotal: 0,
  }
}

function processOrderData(lineItems: CreateOrderInput['lineItems']) {
  // Inițializăm cu șablonul complet
  const totals = getInitialOrderTotals()

  const processedLineItems = lineItems.map((item) => {
    const lineValue = round2(item.priceAtTimeOfOrder * Number(item.quantity))
    const lineVatValue = round2(item.vatRateDetails.value)
    const lineTotal = round2(lineValue + lineVatValue)

    if (item.isManualEntry) {
      // Caz 1: Este MANUALĂ (prioritatea 1)
      totals.manualSubtotal += lineValue
      totals.manualVat += lineVatValue
    } else if (item.serviceId) {
      // Caz 2: Este un Serviciu
      totals.servicesSubtotal += lineValue
      totals.servicesVat += lineVatValue
    } else if (item.stockableItemType === 'Packaging') {
      // Caz 3: Este un Ambalaj (verifică explicit tipul)
      totals.packagingSubtotal += lineValue
      totals.packagingVat += lineVatValue
    } else if (item.productId || item.stockableItemType === 'ERPProduct') {
      // Caz 4: Este un Produs (default)
      totals.productsSubtotal += lineValue
      totals.productsVat += lineVatValue
    }
    // --- SFÂRȘIT LOGICĂ CORECTATĂ ---

    // Logica de conversie pentru articolele stocabile rămâne la fel
    let conversionFactor = 1
    let quantityInBaseUnit = item.quantity
    let priceInBaseUnit = item.priceAtTimeOfOrder

    if (
      item.productId &&
      item.stockableItemType &&
      item.baseUnit &&
      item.unitOfMeasure !== item.baseUnit
    ) {
      const option = item.packagingOptions?.find(
        (opt: { unitName: string }) => opt.unitName === item.unitOfMeasure
      )
      if (option && option.baseUnitEquivalent) {
        conversionFactor = option.baseUnitEquivalent
        quantityInBaseUnit = item.quantity * conversionFactor

        if (conversionFactor > 0) {
          const rawPrice = item.priceAtTimeOfOrder / conversionFactor
          // Ex: 1000 / 1600 = 0.625. .toFixed(6) îl păstrează 0.625000 (fără erori de rotunjire)
          priceInBaseUnit = Number(rawPrice.toFixed(6))
        } else {
          priceInBaseUnit = 0
        }
      }
    }

    return {
      ...item,
      lineValue,
      lineVatValue,
      lineTotal,
      conversionFactor: item.productId ? conversionFactor : undefined,
      quantityInBaseUnit: item.productId ? quantityInBaseUnit : undefined,
      priceInBaseUnit: item.productId ? priceInBaseUnit : undefined,
    }
  })

  // Calculăm totalurile generale
  totals.subtotal = round2(
    totals.productsSubtotal +
      totals.servicesSubtotal +
      totals.manualSubtotal +
      totals.packagingSubtotal // <-- ADAUGAT
  )
  totals.vatTotal = round2(
    totals.productsVat +
      totals.servicesVat +
      totals.manualVat +
      totals.packagingVat // <-- ADAUGAT
  )
  totals.grandTotal = round2(totals.subtotal + totals.vatTotal)

  // Rotunjim totul la final
  Object.keys(totals).forEach((key) => {
    totals[key as keyof typeof totals] = round2(
      totals[key as keyof typeof totals]
    )
  })

  // Returnăm totalurile complete
  return { processedLineItems, finalTotals: totals }
}

export async function getOrderFormInitialData() {
  try {
    const [shippingRatesResult, vatRatesResult, services, permits] =
      await Promise.all([
        getShippingRates(),
        getVatRates(),
        getActiveCommonServices(),
        getActivePermits(),
      ])

    const shippingRates =
      shippingRatesResult.success && shippingRatesResult.data
        ? shippingRatesResult.data
        : []
    const vatRates =
      vatRatesResult.success && vatRatesResult.data
        ? (vatRatesResult.data as VatRateDTO[])
        : []

    return {
      success: true,
      data: {
        shippingRates,
        vatRates,
        services,
        permits,
      },
    }
  } catch (error) {
    console.error(
      'Eroare la preluarea datelor inițiale pentru formular:',
      error
    )
    return {
      success: false,
      message: 'Nu s-au putut încărca datele.',
      data: {
        shippingRates: [],
        vatRates: [],
        services: [],
        permits: [],
      },
    }
  }
}
export async function createOrder(
  data: CreateOrderInput,
  status: 'DRAFT' | 'CONFIRMED'
) {
  const session = await startSession()
  session.startTransaction()

  try {
    const sessionAuth = await auth()
    if (!sessionAuth?.user?.id || !sessionAuth?.user?.name) {
      throw new Error(
        'Utilizator neautentificat sau date incomplete. Acțiune interzisă.'
      )
    }
    const { id: userId, name: userName } = sessionAuth.user

    const validatedData = CreateOrderInputSchema.parse(data)

    const { processedLineItems, finalTotals } = processOrderData(
      validatedData.lineItems
    )

    const orderNumber = await generateOrderNumber({ session })

    const orderData = new Order({
      ...validatedData,
      orderNumber,
      status,
      salesAgent: userId,
      client: validatedData.clientId,
      salesAgentSnapshot: {
        name: userName,
      },
      lineItems: processedLineItems,
      totals: finalTotals,
    })

    const newOrder = await orderData.save({ session })

    if (status === 'CONFIRMED') {
      await reserveStock(
        newOrder._id,
        newOrder.client,
        newOrder.lineItems,
        session
      )
    }

    await session.commitTransaction()

    revalidatePath('/orders')
    return {
      success: true,
      message: `Comanda ${orderNumber} a fost creată cu succes.`,
      data: JSON.parse(JSON.stringify(newOrder)),
    }
  } catch (error) {
    await session.abortTransaction()
    console.error('Eroare la crearea comenzii:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: 'Datele comenzii sunt invalide.',
        errors: error.flatten().fieldErrors,
      }
    }
    const errorMessage =
      error instanceof Error ? error.message : 'A apărut o eroare necunoscută.'
    return {
      success: false,
      message: errorMessage,
    }
  } finally {
    await session.endSession()
  }
}

export async function updateOrder(orderId: string, newData: CreateOrderInput) {
  const session = await startSession()
  session.startTransaction()

  try {
    const sessionAuth = await auth()
    if (!sessionAuth?.user?.id || !sessionAuth?.user?.name) {
      throw new Error('Utilizator neautentificat pentru actualizare.')
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('ID Comandă invalid.')
    }

    const oldOrder = await Order.findById(orderId).session(session)
    if (!oldOrder) {
      throw new Error('Comanda nu a fost găsită.')
    }

    const allowedStatuses: IOrder['status'][] = [
      'DRAFT',
      'CONFIRMED',
      'SCHEDULED',
      'PARTIALLY_DELIVERED',
      'DELIVERED',
    ]
    if (!allowedStatuses.includes(oldOrder.status)) {
      throw new Error(
        `Comanda nu poate fi modificată în statusul "${oldOrder.status}".`
      )
    }

    const wasConfirmed =
      oldOrder.status === 'CONFIRMED' ||
      oldOrder.status === 'PARTIALLY_DELIVERED' ||
      oldOrder.status === 'SCHEDULED'

    const newStatus = oldOrder.status === 'DRAFT' ? 'DRAFT' : 'CONFIRMED'

    // 1. Procesăm datele brute
    const validatedData = CreateOrderInputSchema.parse(newData)
    const { processedLineItems: rawNewItems, finalTotals: newFinalTotals } =
      processOrderData(validatedData.lineItems)

    const oldLinesMap = new Map<string, IOrderLineItem>()
    oldOrder.lineItems.forEach((item: IOrderLineItem) => {
      if (item._id) oldLinesMap.set(item._id.toString(), item)
    })

    const mergedLineItems = rawNewItems.map((newItem) => {
      let existingItem: IOrderLineItem | undefined = undefined

      if (newItem._id && oldLinesMap.has(newItem._id.toString())) {
        existingItem = oldLinesMap.get(newItem._id.toString())
      }

      const newQuantity = Number(newItem.quantity) || 0

      if (existingItem) {
        // Validare de Business
        if (newQuantity < existingItem.quantityShipped) {
          throw new Error(
            `Eroare la "${newItem.productName}": Cantitatea nouă (${newQuantity}) nu poate fi mai mică decât cea deja livrată (${existingItem.quantityShipped}).`
          )
        }

        return {
          ...newItem,
          _id: existingItem._id,
          quantityShipped: existingItem.quantityShipped,
        }
      }

      // Linie nouă
      return {
        ...newItem,
        quantityShipped: 0,
        _id: new Types.ObjectId(),
      }
    })

    // ANULĂM STOCUL VECHI
    if (wasConfirmed) {
      console.log(
        `[updateOrder] Anulare rezervări vechi pentru comanda ${oldOrder.orderNumber}`
      )
      await unreserveStock(oldOrder.lineItems, session)
    }

    // Actualizăm documentul
    oldOrder.set({
      ...validatedData,
      totals: newFinalTotals,
      status: newStatus === 'DRAFT' ? 'DRAFT' : oldOrder.status,
    })

    oldOrder.lineItems = mergedLineItems as Types.DocumentArray<IOrderLineItem>

    const totalShipped = mergedLineItems.reduce(
      (acc: number, item: { quantityShipped: number }) =>
        acc + (item.quantityShipped || 0),
      0
    )

    if (totalShipped > 0 && oldOrder.status !== 'DELIVERED') {
      oldOrder.status = 'PARTIALLY_DELIVERED'
    }

    const updatedOrder = await oldOrder.save({ session })

    // REZERVĂM STOCUL NOU
    if (updatedOrder.status !== 'DRAFT') {
      console.log(
        `[updateOrder] Rezervare stoc nou pentru comanda ${updatedOrder.orderNumber}`
      )
      await reserveStock(
        updatedOrder._id,
        updatedOrder.client,
        updatedOrder.lineItems,
        session
      )
    }

    await session.commitTransaction()

    revalidatePath('/orders')
    revalidatePath(`/orders/${orderId}`)
    revalidatePath(`/orders/${orderId}/edit`)

    return {
      success: true,
      message: `Comanda ${updatedOrder.orderNumber} a fost actualizată cu succes.`,
      data: JSON.parse(JSON.stringify(updatedOrder)),
    }
  } catch (error) {
    await session.abortTransaction()
    console.error('Eroare la actualizarea comenzii:', error)
    const msg = error instanceof Error ? error.message : formatError(error)
    return { success: false, message: msg }
  } finally {
    await session.endSession()
  }
}
export async function cancelOrder(orderId: string) {
  const session = await startSession()
  session.startTransaction()

  try {
    const order = await Order.findById(orderId).session(session)
    if (!order) {
      throw new Error('Comanda nu a fost găsită.')
    }

    // Eliberăm stocul DOAR dacă comanda era confirmată
    if (order.status === 'CONFIRMED') {
      await unreserveStock(order.lineItems, session)
    }

    // Setăm noul status
    order.status = 'CANCELLED'
    await order.save({ session })

    await session.commitTransaction()
    revalidatePath('/orders')
    return { success: true, message: 'Comanda a fost anulată cu succes.' }
  } catch (error) {
    await session.abortTransaction()
    console.error('Eroare la anularea comenzii:', error)
    return { success: false, message: formatError(error) }
  } finally {
    await session.endSession()
  }
}
export async function getAllOrders(
  page: number = 1
): Promise<{ data: PopulatedOrder[]; totalPages: number }> {
  try {
    await connectToDatabase()

    const skipAmount = (page - 1) * PAGE_SIZE

    const [orders, totalOrders] = await Promise.all([
      Order.find({})
        .sort({ createdAt: -1 })
        .skip(skipAmount)
        .limit(PAGE_SIZE)
        .populate({ path: 'client', select: 'name' })
        .populate({ path: 'salesAgent', select: 'name' })
        .lean(),
      Order.countDocuments({}),
    ])

    const totalPages = Math.ceil(totalOrders / PAGE_SIZE)

    return {
      data: JSON.parse(JSON.stringify(orders)),
      totalPages,
    }
  } catch (error) {
    console.error('Eroare la preluarea comenzilor:', error)
    return { data: [], totalPages: 0 }
  }
}
export async function getOrderById(
  orderId: string
): Promise<PopulatedOrder | null> {
  try {
    await connectToDatabase()

    const order = await Order.findById(orderId)
      .populate({ path: 'client', select: 'name' })
      .populate({ path: 'salesAgent', select: 'name' })
      .lean()

    if (!order) {
      return null
    }

    return JSON.parse(JSON.stringify(order))
  } catch (error) {
    console.error('Eroare la preluarea comenzii:', error)
    return null
  }
}

export async function confirmOrder(orderId: string) {
  const session = await startSession()
  session.startTransaction()

  try {
    const sessionAuth = await auth()
    if (!sessionAuth?.user?.id) {
      throw new Error('Utilizator neautentificat.')
    }

    // 1. Găsim comanda
    const order = await Order.findById(orderId).session(session)
    if (!order) throw new Error('Comanda nu a fost găsită.')

    if (order.status !== 'DRAFT') {
      throw new Error(
        'Doar comenzile "Ciornă" pot fi finalizate prin această acțiune.'
      )
    }

    // 2. Schimbăm statusul
    order.status = 'CONFIRMED'
    await order.save({ session })

    await reserveStock(order._id, order.client, order.lineItems, session)

    await session.commitTransaction()

    revalidatePath('/orders')
    revalidatePath(`/orders/${orderId}`)

    return {
      success: true,
      message: 'Comanda a fost finalizată și stocul rezervat.',
    }
  } catch (error) {
    await session.abortTransaction()
    console.error('Eroare la confirmarea comenzii:', error)
    const msg = error instanceof Error ? error.message : 'Eroare necunoscută'
    return { success: false, message: msg }
  } finally {
    await session.endSession()
  }
}
