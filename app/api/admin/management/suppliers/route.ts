import { auth } from '@/auth'
import {
  createSupplier,
  getAllSuppliersForAdmin,
} from '@/lib/db/modules/suppliers/supplier.actions'
import { formatError } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get('page')) || 1
  const result = await getAllSuppliersForAdmin({ page })
  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.name) {
    return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
  }
  const userId = session.user.id
  const userName = session.user.name

  try {
    const data = await request.json()
    const ip = request.headers.get('x-forwarded-for') || ''
    const userAgent = request.headers.get('user-agent') || ''

    const result = await createSupplier(data, userId, userName, ip, userAgent)

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 })
    }
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: formatError(err) }, { status: 400 })
  }
}
