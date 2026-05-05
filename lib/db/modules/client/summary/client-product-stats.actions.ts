'use server'

import { connectToDatabase } from '@/lib/db'
import InvoiceModel from '../../financial/invoices/invoice.model'
import { CLIENT_DETAIL_PAGE_SIZE, TIMEZONE } from '@/lib/constants'
import mongoose, { PipelineStage, Types } from 'mongoose'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export interface ClientProductStat {
  _id: string
  productName: string
  itemType: 'ERPProduct' | 'Packaging' | 'Service' | 'Manual'
  totalValue: number
}

export type ClientProductStatsPage = {
  success: true
  data: ClientProductStat[]
  totalPages: number
  total: number
}

export type ClientProductStatsError = {
  success: false
  data: []
  totalPages: 0
  total: 0
  message: string
}

export async function getProductStatsForClient(
  clientId: string,
  page: number = 1,
  startDateStr?: string,
  endDateStr?: string,
): Promise<ClientProductStatsPage | ClientProductStatsError> {
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

    const aggregationPipeline: PipelineStage[] = [
      // 1. Găsește facturile finalizate (FĂRĂ AVANS)
      {
        $match: {
          clientId: objectId,
          status: { $in: ['APPROVED', 'PAID', 'PARTIAL_PAID'] },
          invoiceType: { $ne: 'AVANS' },
          invoiceDate: { $gte: start, $lte: end },
        },
      },
      // 2. "Sparge" array-ul de itemi
      {
        $unwind: '$items',
      },
      // 3. Determinăm tipul REAL ---
      {
        $addFields: {
          'items.itemType': {
            $cond: {
              if: { $gt: ['$items.serviceId', null] },
              then: 'Service',
              else: { $ifNull: ['$items.stockableItemType', 'Manual'] },
            },
          },
        },
      },
      // 4. Grupează după Nume și Tip
      {
        $group: {
          _id: {
            name: '$items.productName',
            type: '$items.itemType',
          },
          totalValue: { $sum: '$items.lineValue' },
        },
      },
      // 5. Sortăm după valoarea totală, descrescător
      {
        $sort: {
          totalValue: -1,
        },
      },
      // 6. Paginare
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
      // 7. Curățăm output-ul
      {
        $unwind: '$metadata',
      },
      {
        $project: {
          total: '$metadata.total',
          data: {
            $map: {
              input: '$data',
              as: 'item',
              in: {
                _id: { $concat: ['$$item._id.name', '-', '$$item._id.type'] },
                productName: '$$item._id.name',
                itemType: '$$item._id.type',
                totalValue: '$$item.totalValue',
              },
            },
          },
        },
      },
    ]

    const result = await InvoiceModel.aggregate(aggregationPipeline)

    if (result.length === 0) {
      return { success: true, data: [], totalPages: 0, total: 0 }
    }

    const pageData = result[0]

    return {
      success: true,
      data: JSON.parse(JSON.stringify(pageData.data)),
      totalPages: Math.ceil(pageData.total / limit),
      total: pageData.total,
    }
  } catch (error: unknown) {
    // Folosim errorMessage corect ---
    let errorMessage = 'Eroare la getProductStatsForClient'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    console.error('Eroare la getProductStatsForClient:', error)
    return {
      success: false,
      data: [],
      totalPages: 0,
      total: 0,
      message: errorMessage,
    }
  }
}
