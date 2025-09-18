import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { formatError } from '@/lib/utils'
import {
  deleteDriver,
  updateDriver,
} from '@/lib/db/modules/fleet/drivers/drivers.actions'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.name) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()
    const payload = { ...data, _id: id }

    const result = await updateDriver(
      payload,
      session.user.id,
      session.user.name
    )

    if (!result.success) throw new Error(result.message)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ message: formatError(err) }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params
    const result = await deleteDriver(id, session.user.id)

    if (!result.success) {
      throw new Error(result.message)
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ message: formatError(err) }, { status: 400 })
  }
}
