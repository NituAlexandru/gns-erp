'use server'

import { connectToDatabase } from '@/lib/db'
import InvoiceModel from './invoice.model'
import { InvoiceStatusKey } from './invoice.types'
import { CLIENT_DETAIL_PAGE_SIZE } from '@/lib/constants'
import mongoose, { Types } from 'mongoose'
import { InvoiceTotals } from './invoice.types'

export interface ClientInvoiceListItem {
  _id: Types.ObjectId
  seriesName: string
  invoiceNumber: string
  invoiceType: 'STANDARD' | 'STORNO' | 'AVANS' | 'PROFORMA'
  invoiceDate: Date
  dueDate: Date
  status: InvoiceStatusKey
  totals: Pick<InvoiceTotals, 'grandTotal'>
  clientId: {
    _id: Types.ObjectId
    name: string
  }
}
// -----------------------------------------------------------

export type ClientInvoicesPage = {
  data: ClientInvoiceListItem[]
  totalPages: number
  total: number
}

export async function getInvoicesForClient(
  clientId: string,
  page: number = 1
): Promise<ClientInvoicesPage> {
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
      invoiceType: { $ne: 'PROFORMA' },
    }

    const total = await InvoiceModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const invoices = await InvoiceModel.find(queryConditions)
      .select(
        'seriesName invoiceNumber invoiceType invoiceDate dueDate status totals.grandTotal clientId'
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
