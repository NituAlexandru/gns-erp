'use server'

import { connectToDatabase } from '@/lib/db'
import DeliveryNoteModel from './delivery-note.model'
import { CLIENT_DETAIL_PAGE_SIZE, TIMEZONE } from '@/lib/constants'
import mongoose, { Types } from 'mongoose'
import { DeliveryNoteStatusKey } from './delivery-note.constants'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export interface ClientDeliveryNoteItem {
  _id: Types.ObjectId
  noteNumber: string
  seriesName: string
  createdAt: Date
  status: DeliveryNoteStatusKey
  orderNumberSnapshot: string
  totals: {
    grandTotal: number
  }
}

export type ClientDeliveryNotesPage = {
  data: ClientDeliveryNoteItem[]
  totalPages: number
  total: number
  totalSum: number
}

export async function getDeliveryNotesForClient(
  clientId: string,
  page: number = 1,
  startDateStr?: string,
  endDateStr?: string,
): Promise<ClientDeliveryNotesPage> {
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
      clientId: objectId,
      createdAt: { $gte: start, $lte: end },
    }

    const total = await DeliveryNoteModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0, totalSum: 0 }
    }

    const sumAggregation = await DeliveryNoteModel.aggregate([
      {
        $match: {
          ...queryConditions,
          status: { $ne: 'CANCELLED' },
        },
      },
      { $group: { _id: null, totalSum: { $sum: '$totals.grandTotal' } } },
    ])

    const totalSum = sumAggregation.length > 0 ? sumAggregation[0].totalSum : 0

    const deliveryNotes = await DeliveryNoteModel.find(queryConditions)
      .select(
        'noteNumber seriesName createdAt status orderNumberSnapshot totals.grandTotal',
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const typedDeliveryNotes =
      deliveryNotes as unknown as ClientDeliveryNoteItem[]

    return {
      data: JSON.parse(JSON.stringify(typedDeliveryNotes)),
      totalPages: Math.ceil(total / limit),
      total: total,
      totalSum: totalSum,
    }
  } catch (error) {
    console.error('Eroare la getDeliveryNotesForClient:', error)
    return { data: [], totalPages: 0, total: 0, totalSum: 0 }
  }
}
