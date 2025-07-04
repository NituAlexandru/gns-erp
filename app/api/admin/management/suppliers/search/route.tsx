
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectToDatabase } from '@/lib/db'
import SupplierModel from '@/lib/db/modules/suppliers/supplier.model'

export async function GET(request: Request) {
  await connectToDatabase()

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json([])

  const regex = new RegExp(q, 'i')
  //eslint-disable-next-line
  const orFilters: any[] = [
    { name: { $regex: regex } },
    { fiscalCode: { $regex: regex } },
  ]

  // dacă q arată ca un ObjectId valid, permite și căutare exactă pe _id
  if (Types.ObjectId.isValid(q)) {
    orFilters.push({ _id: new Types.ObjectId(q) })
  }

  const docs = await SupplierModel.find({ $or: orFilters })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return NextResponse.json(JSON.parse(JSON.stringify(docs)))
}
