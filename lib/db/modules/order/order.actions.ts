'use server'

import { revalidatePath } from 'next/cache'
import Order from './order.model'
import { CreateOrderInputSchema } from './validator'
import { CreateOrderInput, PopulatedOrder } from './types'
import { connectToDatabase } from '../..'
import { startSession } from 'mongoose'
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
function processOrderData(lineItems: CreateOrderInput['lineItems']) {
  const processedLineItems = lineItems.map((item) => {
    const lineValue = round2(item.priceAtTimeOfOrder * Number(item.quantity))
    const lineVatValue = round2(item.vatRateDetails.value)
    const lineTotal = round2(lineValue + lineVatValue)
    return { ...item, lineValue, lineVatValue, lineTotal }
  })

  const totals = processedLineItems.reduce(
    (acc, item) => {
      acc.subtotal += item.lineValue
      acc.vatTotal += item.lineVatValue
      return acc
    },
    { subtotal: 0, vatTotal: 0 }
  )

  const grandTotal = round2(totals.subtotal + totals.vatTotal)

  const finalTotals = {
    subtotal: round2(totals.subtotal),
    vatTotal: round2(totals.vatTotal),
    grandTotal,
  }

  return { processedLineItems, finalTotals }
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

    const newOrder = new Order({
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

    await newOrder.save({ session })

    if (status === 'CONFIRMED') {
      await reserveStock(processedLineItems, session)
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
