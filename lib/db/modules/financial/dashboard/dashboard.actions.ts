'use server'

import { connectToDatabase } from '@/lib/db'
import { startOfYear, endOfYear } from 'date-fns'
import { PipelineStage, Types } from 'mongoose'
import OrderModel from '@/lib/db/modules/order/order.model'
import DeliveryNoteModel from '@/lib/db/modules/financial/delivery-notes/delivery-note.model'
import InvoiceModel from '@/lib/db/modules/financial/invoices/invoice.model'
import ClientSummary from '@/lib/db/modules/client/summary/client-summary.model'
import {
  FinancialDashboardData,
  RecentDocument,
  BlockedClientSummary,
} from './dashboard.types'
import { OverdueClientSummary } from '../treasury/summary/summary.types'
import '../../client/client.model'
import '@/lib/db/modules/client/summary/client-summary.model'

interface LeanDoc {
  _id: unknown
  createdAt: Date
  status: string
  seriesName?: string
  noteNumber?: string | number
  invoiceNumber?: string | number
  clientSnapshot?: {
    name?: string
  }
}

interface RawOverdueClientResult {
  _id: Types.ObjectId
  clientName: string
  totalOverdue: number
  overdueInvoices: {
    _id: Types.ObjectId
    seriesName: string
    invoiceNumber: string
    dueDate: Date
    remainingAmount: number
    daysOverdue: number
  }[]
}

interface LeanClientSummary {
  _id: unknown
  clientId?: { name?: string }
  outstandingBalance: number
  creditLimit: number
  isBlocked: boolean
  lockingStatus?: 'AUTO' | 'MANUAL_BLOCK' | 'MANUAL_UNBLOCK'
  lockingReason?: string
}

export async function getFinancialDashboardData(
  year: number
): Promise<FinancialDashboardData> {
  await connectToDatabase()

  const startDate = startOfYear(new Date(year, 0, 1))
  const endDate = endOfYear(new Date(year, 0, 1))

  const dateFilter = {
    createdAt: { $gte: startDate, $lte: endDate },
  }

  const yearlyOverduePipeline: PipelineStage[] = [
    {
      $match: {
        invoiceDate: { $gte: startDate, $lte: endDate },
        remainingAmount: { $gt: 0.01 },
        dueDate: { $lt: new Date() },
        status: { $nin: ['DRAFT', 'CANCELLED'] },
        invoiceType: { $in: ['STANDARD', 'STORNO'] },
      },
    },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'clientData',
      },
    },
    { $unwind: '$clientData' },
    {
      $project: {
        _id: 1,
        seriesName: 1,
        invoiceNumber: 1,
        dueDate: 1,
        remainingAmount: 1,
        clientName: '$clientData.name',
        clientId: '$clientId',
        daysOverdue: {
          $dateDiff: {
            startDate: '$dueDate',
            endDate: new Date(),
            unit: 'day',
          },
        },
      },
    },
    {
      $group: {
        _id: '$clientId',
        clientName: { $first: '$clientName' },
        totalOverdue: { $sum: '$remainingAmount' },
        overdueInvoices: {
          $push: {
            _id: '$_id',
            seriesName: '$seriesName',
            invoiceNumber: '$invoiceNumber',
            dueDate: '$dueDate',
            remainingAmount: '$remainingAmount',
            daysOverdue: '$daysOverdue',
          },
        },
      },
    },
    { $sort: { totalOverdue: -1 } },
    { $limit: 10 },
  ]

  const [
    ordersCount,
    deliveryNotesCount,
    invoicesCount,
    proformasCount,
    creditNotesCount,
    recentNotesDocs,
    // recentInvoicesDocs, <--- SCOS (Nu mai avem nevoie de query)
    yearlyOverdueRaw,
    blockedClientsDocs,
  ] = await Promise.all([
    OrderModel.countDocuments(dateFilter),
    DeliveryNoteModel.countDocuments(dateFilter),
    InvoiceModel.countDocuments({
      ...dateFilter,
      invoiceType: { $in: ['STANDARD', 'AVANS'] },
    }),
    InvoiceModel.countDocuments({ ...dateFilter, invoiceType: 'PROFORMA' }),
    InvoiceModel.countDocuments({ ...dateFilter, invoiceType: 'STORNO' }),

    DeliveryNoteModel.find(dateFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('clientSnapshot', 'name')
      .lean(),

    // InvoiceModel.find(...) <--- SCOS QUERY-UL PENTRU ULTIMELE FACTURI

    InvoiceModel.aggregate(yearlyOverduePipeline),

    ClientSummary.find({ isBlocked: true })
      .populate('clientId', 'name')
      .select(
        'clientId outstandingBalance creditLimit isBlocked lockingStatus lockingReason'
      )
      .lean(),
  ])

  // --- MAPĂRI ---

  const recentDeliveryNotes: RecentDocument[] = (
    recentNotesDocs as unknown as LeanDoc[]
  ).map((doc) => ({
    id: String(doc._id),
    number: `${doc.seriesName || ''}${doc.noteNumber || ''}`,
    clientName: doc.clientSnapshot?.name || 'Client Necunoscut',
    status: doc.status,
    date: doc.createdAt,
    type: 'DELIVERY_NOTE',
  }))

  // SCOS MAPAREA PENTRU RECENT INVOICES

  const rawOverdueData = yearlyOverdueRaw as unknown as RawOverdueClientResult[]
  const overdueClients: OverdueClientSummary[] = rawOverdueData.map((c) => ({
    _id: c._id.toString(),
    clientName: c.clientName,
    totalOverdue: c.totalOverdue,
    overdueInvoices: c.overdueInvoices.map((inv) => ({
      _id: inv._id.toString(),
      seriesName: inv.seriesName,
      invoiceNumber: inv.invoiceNumber,
      dueDate: inv.dueDate.toISOString(),
      remainingAmount: inv.remainingAmount,
      daysOverdue: inv.daysOverdue,
    })),
  }))

  const blockedClients: BlockedClientSummary[] = (
    blockedClientsDocs as unknown as LeanClientSummary[]
  ).map((doc) => {
    const balance = doc.outstandingBalance || 0
    const limit = doc.creditLimit || 0
    const excess = balance > limit ? balance - limit : 0

    return {
      // Converim _id la string (în caz că e ObjectId nativ)
      id: String(doc._id),
      clientName: doc.clientId?.name || 'Client Necunoscut',
      outstandingBalance: balance,
      creditLimit: limit,
      excessAmount: excess,
      lockingStatus: doc.lockingStatus || 'AUTO',
      lockingReason: doc.lockingReason || '',
    }
  })

  return {
    stats: {
      ordersCount,
      deliveryNotesCount,
      invoicesCount,
      proformasCount,
      creditNotesCount,
    },
    recentDeliveryNotes,
    // recentInvoices, <--- SCOS DIN RETURN (Asta cauza eroarea de Backend)
    overdueClients,
    blockedClients,
  }
}
