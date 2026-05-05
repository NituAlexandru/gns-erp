'use server'

import { connectToDatabase } from '@/lib/db'
import Order from './order.model'
import { CLIENT_DETAIL_PAGE_SIZE, TIMEZONE } from '@/lib/constants'
import mongoose, { Types } from 'mongoose'
import { OrderStatusKey } from './types'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export interface ClientOrderItem {
  _id: Types.ObjectId
  orderNumber: string
  createdAt: Date
  status: OrderStatusKey
  salesAgentSnapshot: {
    name: string
  }
  totals: {
    grandTotal: number
  }
}

export type ClientOrdersPage = {
  data: ClientOrderItem[]
  totalPages: number
  total: number
}

/**
 * Prelucrează comenzile pentru un client specific, paginat.
 */
export async function getOrdersForClient(
  clientId: string,
  page: number = 1,
  startDateStr?: string,
  endDateStr?: string,
): Promise<ClientOrdersPage> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error('ID Client invalid')
    }

    const objectId = new Types.ObjectId(clientId)
    const limit = CLIENT_DETAIL_PAGE_SIZE
    const skip = (page - 1) * limit

    const currentDate = new Date()
    const currentYearStr = formatInTimeZone(currentDate, TIMEZONE, 'yyyy')

    const start = startDateStr
      ? fromZonedTime(`${startDateStr}T00:00:00.000`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-01-01T00:00:00.000`, TIMEZONE)

    const end = endDateStr
      ? fromZonedTime(`${endDateStr}T23:59:59.999`, TIMEZONE)
      : fromZonedTime(`${currentYearStr}-12-31T23:59:59.999`, TIMEZONE)

    const queryConditions = {
      client: objectId,
      createdAt: { $gte: start, $lte: end },
    }

    const total = await Order.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const orders = await Order.find(queryConditions)
      .select(
        'orderNumber createdAt status salesAgentSnapshot.name totals.grandTotal',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const typedOrders = orders as unknown as ClientOrderItem[]

    return {
      data: JSON.parse(JSON.stringify(typedOrders)),
      totalPages: Math.ceil(total / limit),
      total: total,
    }
  } catch (error) {
    console.error('Eroare la getOrdersForClient:', error)
    return { data: [], totalPages: 0, total: 0 }
  }
}
