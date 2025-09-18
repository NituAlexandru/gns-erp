import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { formatError } from '@/lib/utils'
import { updateDriverStatus } from '@/lib/db/modules/fleet/drivers/drivers.actions'

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
    const { status } = await request.json()

    if (!status) {
      return NextResponse.json(
        { message: 'Statusul lipsește.' },
        { status: 400 }
      )
    }

    const result = await updateDriverStatus(
      id,
      status,
      session.user.id,
      session.user.name
    )

    if (!result.success) throw new Error(result.message)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ message: formatError(err) }, { status: 400 })
  }
}
