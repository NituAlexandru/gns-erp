import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { revokeConfirmation } from '@/lib/db/modules/reception/reception.actions'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { message: 'ID-ul recepției lipsește.' },
        { status: 400 }
      )
    }

    const result = await revokeConfirmation(
      id,
      session.user.id,
      session.user.name || 'Utilizator Neidentificat'
    )

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[RECEPTION_REVOKE_ERROR]', error)
    return NextResponse.json(
      { message: (error as Error).message || 'A apărut o eroare internă' },
      { status: 500 }
    )
  }
}
