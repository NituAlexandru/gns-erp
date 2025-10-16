import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import Order, { IOrder } from '@/lib/db/modules/order/order.model'
import mongoose from 'mongoose'
import { PAGE_SIZE } from '@/lib/constants'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const status = searchParams.get('status')
    const page = Number(searchParams.get('page')) || 1

    const query: mongoose.FilterQuery<IOrder> = {}

    if (status && status !== 'ALL') {
      query.status = status
    }

    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo) query.createdAt.$lte = new Date(dateTo)
    }

    const minTotal = searchParams.get('minTotal')
    if (minTotal) {
      query['totals.grandTotal'] = { $gte: Number(minTotal) }
    }

    const aggregationPipeline: mongoose.PipelineStage[] = []

    if (q) {
      aggregationPipeline.push({
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientDetails',
        },
      })
      aggregationPipeline.push({
        $addFields: {
          clientDetails: { $first: '$clientDetails' },
        },
      })
      aggregationPipeline.push({
        $match: {
          $or: [
            { orderNumber: { $regex: q, $options: 'i' } },
            { 'clientDetails.name': { $regex: q, $options: 'i' } },
          ],
        },
      })
    }

    aggregationPipeline.push({ $match: query })

    aggregationPipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: (page - 1) * PAGE_SIZE },
          { $limit: PAGE_SIZE },
          {
            $lookup: {
              from: 'clients',
              localField: 'client',
              foreignField: '_id',
              as: 'client',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'salesAgent',
              foreignField: '_id',
              as: 'salesAgent',
            },
          },
          { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
          {
            $unwind: { path: '$salesAgent', preserveNullAndEmptyArrays: true },
          },
        ],
        metadata: [{ $count: 'total' }],
      },
    })

    const results = await Order.aggregate(aggregationPipeline)

    const data = results[0].data
    const totalCount = results[0].metadata[0]?.total || 0
    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    return NextResponse.json({ data, totalPages })
  } catch (error) {
    console.error('Eroare la API-ul de preluare comenzi:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
