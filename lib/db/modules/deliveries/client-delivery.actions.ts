'use server'

import { connectToDatabase } from '@/lib/db'
import DeliveryModel from './delivery.model'
import { CLIENT_DETAIL_PAGE_SIZE, TIMEZONE } from '@/lib/constants'
import mongoose, { Types } from 'mongoose'
import { DeliveryStatusKey } from './types'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

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
  totalSum: number
}

export async function getDeliveriesForClient(
  clientId: string,
  page: number = 1,
  startDateStr?: string,
  endDateStr?: string,
): Promise<ClientDeliveriesPage> {
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

    const queryConditions: any = {
      client: objectId,
      createdAt: { $gte: start, $lte: end },
    }

    const total = await DeliveryModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0, totalSum: 0 }
    }

    const sumAggregation = await DeliveryModel.aggregate([
      {
        $match: {
          ...queryConditions,
          status: { $ne: 'CANCELLED' },
        },
      },
      { $group: { _id: null, totalSum: { $sum: '$totals.grandTotal' } } },
    ])

    const totalSum = sumAggregation.length > 0 ? sumAggregation[0].totalSum : 0

    const deliveries = await DeliveryModel.find(queryConditions)
      .select(
        'deliveryNumber requestedDeliveryDate deliveryDate status driverName vehicleNumber totals.grandTotal',
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
      totalSum: totalSum,
    }
  } catch (error) {
    console.error('Eroare la getDeliveriesForClient:', error)
    return { data: [], totalPages: 0, total: 0, totalSum: 0 }
  }
}
