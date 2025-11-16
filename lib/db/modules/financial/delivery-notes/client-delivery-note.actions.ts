'use server'

import { connectToDatabase } from '@/lib/db'
import DeliveryNoteModel from './delivery-note.model' 
import { CLIENT_DETAIL_PAGE_SIZE } from '@/lib/constants' 
import mongoose, { Types } from 'mongoose'
import { DeliveryNoteStatusKey } from './delivery-note.constants'

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
}

export async function getDeliveryNotesForClient(
  clientId: string,
  page: number = 1
): Promise<ClientDeliveryNotesPage> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new Error('ID Client invalid')
    }

    const objectId = new Types.ObjectId(clientId)
    const limit = CLIENT_DETAIL_PAGE_SIZE
    const skip = (page - 1) * limit

    const queryConditions = {
      clientId: objectId,
    }

    const total = await DeliveryNoteModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const deliveryNotes = await DeliveryNoteModel.find(queryConditions)
      .select(
        'noteNumber seriesName createdAt status orderNumberSnapshot totals.grandTotal'
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
    }
  } catch (error) {
    console.error('Eroare la getDeliveryNotesForClient:', error)
    return { data: [], totalPages: 0, total: 0 }
  }
}
