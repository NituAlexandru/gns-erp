import { NextResponse } from 'next/server'
import {
  createSupplier,
  getAllSuppliersForAdmin,
} from '@/lib/db/modules/suppliers'

export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get('page')) || 1
  const result = await getAllSuppliersForAdmin({ page })
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const data = await request.json()
  const result = await createSupplier(data)
  if (!result.success) {
    return NextResponse.json({ message: result.message }, { status: 400 })
  }
  return NextResponse.json(result, { status: 201 })
}
