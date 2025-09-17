import { NextResponse } from 'next/server'
import {
  deleteSupplier,
  getSupplierById,
  updateSupplier,
} from '@/lib/db/modules/suppliers/supplier.actions'
import { auth } from '@/auth'
import { formatError } from '@/lib/utils'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const doc = await getSupplierById(id)
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json(
      { message: 'Supplier inexistent' },
      { status: 404 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ✅ Adăugăm logica de sesiune
  const session = await auth()
  if (!session?.user?.id || !session?.user?.name) {
    return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
  }
  const userId = session.user.id
  const userName = session.user.name

  try {
    const { id } = await params
    const data = await request.json()
    data._id = id // Asigurăm că ID-ul este corect

    const ip = request.headers.get('x-forwarded-for') || ''
    const userAgent = request.headers.get('user-agent') || ''

    // ✅ Trimitem datele de audit către acțiune
    const result = await updateSupplier(data, userId, userName, ip, userAgent)

    if (!result.success)
      return NextResponse.json({ message: result.message }, { status: 400 })

    // revalidatePath este deja în acțiune, nu mai e nevoie aici
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ message: formatError(err) }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { id } = await params
    const ip = request.headers.get('x-forwarded-for') || ''
    const userAgent = request.headers.get('user-agent') || ''
    const result = await deleteSupplier(id, userId, ip, userAgent)

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ message: formatError(err) }, { status: 400 })
  }
}
