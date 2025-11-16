'use server'

import { connectToDatabase } from '@/lib/db'
import Order from './order.model'
import { CLIENT_DETAIL_PAGE_SIZE } from '@/lib/constants'
import mongoose, { Types } from 'mongoose'
import { OrderStatusKey } from './types'

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
  page: number = 1
): Promise<ClientOrdersPage> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error('ID Client invalid')
    }

    const objectId = new Types.ObjectId(clientId)
    const limit = CLIENT_DETAIL_PAGE_SIZE
    const skip = (page - 1) * limit

    const queryConditions = {
      client: objectId,
    }

    const total = await Order.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const orders = await Order.find(queryConditions)
      .select(
        'orderNumber createdAt status salesAgentSnapshot.name totals.grandTotal'
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
