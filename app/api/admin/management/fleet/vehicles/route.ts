import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { formatError } from '@/lib/utils'
import { createVehicle } from '@/lib/db/modules/fleet/vehicle/vehicle.actions'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.name) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
    }

    const data = await request.json()
    const result = await createVehicle(data, session.user.id, session.user.name)

    if (!result.success) {
      throw new Error(result.message)
    }

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ message: formatError(err) }, { status: 400 })
  }
}
