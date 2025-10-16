'use server'

import { revalidatePath } from 'next/cache'
import Order from './order.model'
import { CreateOrderInputSchema } from './validator'
import { CreateOrderInput, PopulatedOrder } from './types'
import { connectToDatabase } from '../..'
import { startSession } from 'mongoose'
import { round2 } from '@/lib/utils'
import { reserveStock } from '../inventory/inventory.actions'
import { generateOrderNumber } from '../numbering/numbering.actions'
import { auth } from '@/auth'
import z from 'zod'
import VehicleRate from '../setting/shipping-rates/shipping.model'

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

function calculateOrderTotals(
  lineItems: CreateOrderInput['lineItems'],
  shippingCost: number
) {
  const totals = lineItems.reduce(
    (acc, item) => {
      const lineSubtotal = item.priceAtTimeOfOrder * Number(item.quantity)
      acc.subtotal += lineSubtotal
      acc.vatTotal += item.vatRateDetails.value
      return acc
    },
    { subtotal: 0, vatTotal: 0 }
  )

  return {
    subtotal: round2(totals.subtotal),
    vatTotal: round2(totals.vatTotal),
    shippingCost: round2(shippingCost),
    grandTotal: round2(totals.subtotal + totals.vatTotal + shippingCost),
  }
}

// --- FUNCȚIA PRINCIPALĂ, CURĂȚATĂ ---
export async function createOrder(
  data: CreateOrderInput,
  status: 'DRAFT' | 'CONFIRMED'
) {
  const session = await startSession()
  session.startTransaction()

  try {
    // --- PASUL 1: Preluăm corect sesiunea și ID-ul utilizatorului din Next-Auth ---
    const sessionAuth = await auth()
    const userId = sessionAuth?.user?.id

    if (!userId) {
      throw new Error('Utilizator neautentificat. Acțiune interzisă.')
    }

    const validatedData = CreateOrderInputSchema.parse(data)

    const orderTotals = calculateOrderTotals(
      validatedData.lineItems,
      validatedData.shippingCost || 0
    )
    const orderNumber = await generateOrderNumber({ session })

    const newOrder = new Order({
      ...validatedData,
      // --- PASUL 2: Folosim numele corecte ale câmpurilor ---
      salesAgent: userId,
      client: validatedData.clientId, // `client` este numele din schemă, `clientId` este numele din datele validate
      orderNumber,
      status,
      totals: orderTotals,
    })

    await newOrder.save({ session })

    if (status === 'CONFIRMED') {
      await reserveStock(validatedData.lineItems, session)
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
    // Trimitem eroarea Zod înapoi, dacă este cazul
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
export async function getAllOrders(): Promise<PopulatedOrder[]> {
  try {
    await connectToDatabase()
    const orders = await Order.find({})
      .populate({
        path: 'client',
        select: 'name',
      })
      .sort({ createdAt: -1 })
      .lean()

    return JSON.parse(JSON.stringify(orders))
  } catch (error) {
    console.error('Eroare la preluarea comenzilor:', error)
    return []
  }
}
