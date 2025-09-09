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
    const userId = session.user.id // Avem nevoie de userId pentru confirmare

    const { id } = await params
    const body = await request.json()
    const { isFinal, ...receptionData } = body

    // Pasul 1: Prevenim suprascrierea accidentală a statusului.
    // Scoatem 'status' din datele trimise pentru update.
    delete receptionData.status

    const payload = { ...receptionData, _id: id }

    // Pasul 2: Actualizăm datele recepției (fără status)
    const updateResult = await updateReception(payload)
    if (!updateResult.success) {
      return NextResponse.json(
        { message: updateResult.message },
        { status: 400 }
      )
    }

    // Pasul 3: Dacă este o salvare finală, o și confirmăm
    if (isFinal) {
      // Apelăm 'confirmReception' cu formatul corect: un singur obiect
      const confirmationResult = await confirmReception({
        receptionId: id,
        userId: userId,
      })

      if (!confirmationResult.success) {
        // Aici este problema ta: recepția apare ca fiind deja confirmată
        // sau nu este găsită din cauza datelor învechite.
        return NextResponse.json(
          {
            message: `Datele au fost salvate, dar finalizarea a eșuat: ${confirmationResult.message}`,
          },
          { status: 400 }
        )
      }
    }

    // Returnăm datele actualizate
    return NextResponse.json(updateResult.data)
  } catch (error: unknown) {
    // Am înlocuit 'any' cu 'unknown'
    console.error('[RECEPTION_PUT_ERROR]', error)

    // Verificăm dacă eroarea este o instanță a clasei Error
    // pentru a putea accesa proprietatea 'message' în siguranță.
    const message =
      error instanceof Error
        ? error.message
        : 'A apărut o eroare internă neașteptată.'

    return NextResponse.json({ message }, { status: 500 })
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
