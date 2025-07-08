import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import ClientModel from '@/lib/db/modules/client/client.model'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''
  await connectToDatabase()
  if (!q) return NextResponse.json([], { status: 200 })

  const regex = new RegExp(q, 'i')
  const results = await ClientModel.find({
    $or: [{ name: regex }, { cnp: q }, { cui: q }, { email: q }, { phone: q }],
  }).lean()

  return NextResponse.json(results)
}
