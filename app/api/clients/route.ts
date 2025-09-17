import { NextResponse } from 'next/server'
import { formatError } from '@/lib/utils'
import {
  createClient,
  getAllClients,
} from '@/lib/db/modules/client/client.actions'
import { auth } from '@/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page')) || 1
    const data = await getAllClients({ page })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { message: formatError(err) || 'Error fetching clients' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !session?.user?.name) {

    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const userName = session.user.name

  try {
    const body = await request.json()
    const ip = request.headers.get('x-forwarded-for') || ''
    const userAgent = request.headers.get('user-agent') || ''

    const result = await createClient(body, userId, userName, ip, userAgent)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { message: formatError(err) || 'Bad Request' },
      { status: 400 }
    )
  }
}
