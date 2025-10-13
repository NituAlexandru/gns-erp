'use server'

import { revalidatePath } from 'next/cache'
import { generateNextDocumentNumber } from '../numbering/numbering.actions' // Presupunem calea
import Order from './order.model'
import { CreateOrderInputSchema } from './validator'
import { CreateOrderInput, PopulatedOrder } from './types'
import { connectToDatabase } from '../..'
import VehicleModel from '../fleet/vehicle/vehicle.model'
import ClientModel from '../client/client.model'
import { IClientDoc } from '../client/types'

export async function calculateShippingCost(
  vehicleType: string,
  distanceInKm: number
): Promise<number> {
  try {
    if (!vehicleType || !distanceInKm || distanceInKm <= 0) {
      return 0
    }
    await connectToDatabase()

    const vehicle = await VehicleModel.findOne({ carType: vehicleType })
      .select('ratePerKm')
      .lean()

    if (!vehicle || !vehicle.ratePerKm) {
      console.warn(
        `Nu a fost găsit un tarif/km pentru tipul de vehicul: ${vehicleType}`
      )
      return 0
    }

    const ratePerKm = vehicle.ratePerKm
    const roundTripDistance = distanceInKm * 2
    const totalCost = roundTripDistance * ratePerKm

    return Math.round(totalCost * 100) / 100
  } catch (error) {
    console.error('Eroare la calcularea costului de transport:', error)
    return 0
  }
}

export async function createOrder(data: CreateOrderInput) {
  try {
    const validationResult = CreateOrderInputSchema.safeParse(data)
    if (!validationResult.success) {
      console.error(
        'Validation Error:',
        validationResult.error.flatten().fieldErrors
      )
      return {
        success: false,
        message: 'Datele comenzii sunt invalide.',
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    const validatedData = validationResult.data

    let subtotal = 0
    let vatTotal = 0

    validatedData.lineItems.forEach((item) => {
      const lineSubtotal = item.priceAtTimeOfOrder * item.quantity
      subtotal += lineSubtotal
      vatTotal += item.vatRateDetails.value
    })

    const client = (await ClientModel.findById(
      validatedData.clientId
    ).lean()) as IClientDoc | null

    if (!client) {
      throw new Error('Clientul specificat în comandă nu a fost găsit.')
    }

    const allAddresses = client.deliveryAddresses
      ? [client.address, ...client.deliveryAddresses]
      : [client.address]

    const deliveryAddressFromDb = allAddresses.find(
      (addr) =>
        addr.strada === validatedData.deliveryAddress.strada &&
        addr.localitate === validatedData.deliveryAddress.localitate
    )

    const distanceInKm = deliveryAddressFromDb?.distanceInKm || 0

    const serverCalculatedShippingCost = await calculateShippingCost(
      validatedData.estimatedVehicleType,
      distanceInKm
    )

    const grandTotal = subtotal + vatTotal + serverCalculatedShippingCost

    const nextNumber = await generateNextDocumentNumber('Comanda')
    if (!nextNumber) {
      throw new Error('Nu s-a putut genera numărul comenzii.')
    }

    const currentYear = new Date().getFullYear()
    const paddedNumber = String(nextNumber).padStart(4, '0')
    const orderNumber = `CMD-${currentYear}-${paddedNumber}`

    const newOrder = new Order({
      ...validatedData,
      orderNumber: orderNumber,
      status: 'Ciorna',
      totals: {
        subtotal,
        vatTotal,
        shippingCost: serverCalculatedShippingCost,
        grandTotal,
      },
    })

    await newOrder.save()

    revalidatePath('/admin/orders')

    return {
      success: true,
      message: 'Comanda a fost creată cu succes!',
      data: JSON.parse(JSON.stringify(newOrder)),
    }
  } catch (error) {
    console.error('Eroare la crearea comenzii:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'A apărut o eroare necunoscută.'
    return {
      success: false,
      message: errorMessage,
    }
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
