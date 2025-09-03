import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ReceptionModel from '@/lib/db/modules/reception/reception.model'
import mongoose from 'mongoose'
import { PAGE_SIZE } from '@/lib/constants'

export async function GET(request: Request) {
  try {
    await connectToDatabase()

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(
      url.searchParams.get('pageSize') || String(PAGE_SIZE),
      10
    )
    const status = url.searchParams.get('status')
    const createdBy = url.searchParams.get('createdBy')

    // Construim obiectul de filtrare pentru Mongoose
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {}
    if (status && status !== 'ALL') filter.status = status
    if (
      createdBy &&
      createdBy !== 'ALL' &&
      mongoose.isValidObjectId(createdBy)
    ) {
      filter.createdBy = createdBy
    }

    // Calculăm numărul total de documente care corespund filtrului
    const total = await ReceptionModel.countDocuments(filter)

    // Preluăm doar datele pentru pagina curentă
    const data = await ReceptionModel.find(filter)
      .populate('supplier', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()

    return NextResponse.json({
      data,
      total,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('[RECEPTIONS_LIST_ERROR]', error)
    return NextResponse.json(
      { message: 'Eroare internă de server' },
      { status: 500 }
    )
  }
}
