'use server'

import { connectToDatabase } from '@/lib/db'
import DeliveryModel from './delivery.model'
import { CLIENT_DETAIL_PAGE_SIZE } from '@/lib/constants'
import mongoose, { Types } from 'mongoose'
import { DeliveryStatusKey } from './types'

export interface ClientDeliveryListItem {
  _id: Types.ObjectId
  deliveryNumber: string
  requestedDeliveryDate: Date
  deliveryDate?: Date
  status: DeliveryStatusKey
  driverName?: string
  vehicleNumber?: string
  totals: {
    grandTotal: number
  }
}

export type ClientDeliveriesPage = {
  data: ClientDeliveryListItem[]
  totalPages: number
  total: number
}

export async function getDeliveriesForClient(
  clientId: string,
  page: number = 1
): Promise<ClientDeliveriesPage> {
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

    const total = await DeliveryModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const deliveries = await DeliveryModel.find(queryConditions)
      .select(
        'deliveryNumber requestedDeliveryDate deliveryDate status driverName vehicleNumber totals.grandTotal'
      )
      .sort({ requestedDeliveryDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const typedDeliveries = deliveries as unknown as ClientDeliveryListItem[]

    return {
      data: JSON.parse(JSON.stringify(typedDeliveries)),
      totalPages: Math.ceil(total / limit),
      total: total,
    }
  } catch (error) {
    console.error('Eroare la getDeliveriesForClient:', error)
    return { data: [], totalPages: 0, total: 0 }
  }
}
