import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  confirmReception,
  deleteReception,
  updateReception,
} from '@/lib/db/modules/reception/reception.actions'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const payload = { ...body, _id: id }

    // Actualizăm datele recepției
    const updateResult = await updateReception(payload)
    if (!updateResult.success) {
      return NextResponse.json(
        { message: updateResult.message },
        { status: 400 }
      )
    }

    // Dacă este o salvare finală, o și confirmăm
    if (body.isFinal) {
      const confirmationResult = await confirmReception(id)
      if (!confirmationResult.success) {
        return NextResponse.json(
          {
            message: `Datele au fost salvate, dar finalizarea a eșuat: ${confirmationResult.message}`,
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Recepție actualizată.',
    })
    //eslint-disable-next-line
  } catch (error: any) {
    console.error('[RECEPTION_PUT_ERROR]', error)
    return NextResponse.json(
      { message: error.message || 'A apărut o eroare internă' },
      { status: 500 }
    )
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
    if (!id) {
      return NextResponse.json(
        { message: 'ID-ul recepției lipsește.' },
        { status: 400 }
      )
    }

    const result = await deleteReception(id)

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 403 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[RECEPTION_DELETE_ERROR]', error)
    return NextResponse.json(
      { message: (error as Error).message || 'A apărut o eroare internă' },
      { status: 500 }
    )
  }
}
