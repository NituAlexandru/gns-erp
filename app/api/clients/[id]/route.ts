import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { formatError } from '@/lib/utils'
import {
  getClientById,
  updateClient,
  deleteClient,
} from '@/lib/db/modules/client/client.actions'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id || !session?.user?.name) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const userName = session.user.name

  try {
    const { id } = await params
    const data = await request.json()
    data._id = id

    const ip = request.headers.get('x-forwarded-for') || ''
    const userAgent = request.headers.get('user-agent') || ''

    const result = await updateClient(data, userId, userName, ip, userAgent)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { message: formatError(err) || 'Error updating client' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { id } = await params
    const ip = request.headers.get('x-forwarded-for') || ''
    const userAgent = request.headers.get('user-agent') || ''

    const result = await deleteClient(id, userId, ip, userAgent)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { message: formatError(err) || 'Error deleting client' },
      { status: 400 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await getClientById(id)
    return NextResponse.json(client)
  } catch (err) {
    return NextResponse.json(
      { message: formatError(err) || 'Client not found' },
      { status: 404 }
    )
  }
}
