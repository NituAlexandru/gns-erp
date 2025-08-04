import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ReceptionModel from '@/lib/db/modules/reception/reception.model'
import mongoose from 'mongoose'
import { PAGE_SIZE } from '@/lib/constants'

export async function GET(request: Request) {
  await connectToDatabase()

  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.toLowerCase() || ''
  const status = url.searchParams.get('status')
  const createdBy = url.searchParams.get('createdBy')
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const size = parseInt(
    url.searchParams.get('pageSize') || String(PAGE_SIZE),
    10
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {}
  if (status) filter.status = status
  if (createdBy && mongoose.isValidObjectId(createdBy))
    filter.createdBy = createdBy

  if (q) {
    const term = new RegExp(q, 'i')
    filter.$or = [
      { 'supplier.name': term },
      { 'createdBy.name': term },
      { receptionDate: { $regex: term } }, // not perfect but e OK
      { 'deliveries.dispatchNoteNumber': term },
      { 'invoices.number': term },
      // total sum: vom calcula client-side
    ]
  }

  const total = await ReceptionModel.countDocuments(filter)
  const data = await ReceptionModel.find(filter)
    .populate('supplier', 'name')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * size)
    .limit(size)
    .lean()

  return NextResponse.json({ data, total })
}
