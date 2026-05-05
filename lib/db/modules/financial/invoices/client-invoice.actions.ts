'use server'

import { connectToDatabase } from '@/lib/db'
import InvoiceModel from './invoice.model'
import { InvoiceStatusKey } from './invoice.types'
import { CLIENT_DETAIL_PAGE_SIZE, TIMEZONE } from '@/lib/constants'
import mongoose, { Types } from 'mongoose'
import { InvoiceTotals } from './invoice.types'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export interface ClientInvoiceListItem {
  _id: Types.ObjectId
  seriesName: string
  invoiceNumber: string
  invoiceType: 'STANDARD' | 'STORNO' | 'AVANS' | 'PROFORMA'
  invoiceDate: Date
  dueDate: Date
  status: InvoiceStatusKey
  paidAmount: number
  remainingAmount: number
  totals: Pick<InvoiceTotals, 'grandTotal'>
  clientId: {
    _id: Types.ObjectId
    name: string
  }
}

export type ClientInvoicesPage = {
  data: ClientInvoiceListItem[]
  totalPages: number
  total: number
}

interface InvoiceQuery {
  clientId: Types.ObjectId
  invoiceType: { $ne: string }
  status?: string | { $in: string[] }
  invoiceDate?: { $gte: Date; $lte: Date }
}

export async function getInvoicesForClient(
  clientId: string,
  page: number = 1,
  statusFilter: string = 'ALL',
  startDateStr?: string,
  endDateStr?: string,
): Promise<ClientInvoicesPage> {
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

    const queryConditions: InvoiceQuery = {
      clientId: objectId,
      invoiceType: { $ne: 'PROFORMA' },
      invoiceDate: { $gte: start, $lte: end },
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNPAID') {
        // Filtru special: Neachitate (Aprobate sau Parțial Plătite)
        queryConditions.status = { $in: ['APPROVED', 'PARTIAL_PAID'] }
      } else {
        // Filtru specific (ex: 'PAID', 'CANCELLED')
        queryConditions.status = statusFilter
      }
    }

    const total = await InvoiceModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const invoices = await InvoiceModel.find(queryConditions)
      .select(
        'seriesName invoiceNumber invoiceType invoiceDate dueDate status paidAmount remainingAmount totals.grandTotal clientId',
      )
      .populate<{
        clientId: { _id: Types.ObjectId; name: string }
      }>('clientId', 'name')
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const typedInvoices = invoices as unknown as ClientInvoiceListItem[]

    return {
      data: JSON.parse(JSON.stringify(typedInvoices)),
      totalPages: Math.ceil(total / limit),
      total: total,
    }
  } catch (error) {
    console.error('Eroare la getInvoicesForClient:', error)
    return { data: [], totalPages: 0, total: 0 }
  }
}
