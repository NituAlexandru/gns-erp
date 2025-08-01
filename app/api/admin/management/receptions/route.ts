import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  confirmReception,
  createReception,
} from '@/lib/db/modules/reception/reception.actions'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
    }

    const userId = session.user.id
    // Preluăm datele trimise de formular
    const body = await request.json()

    const { isFinal, ...receptionData } = body
    // Construim payload-ul final
    const finalPayload = {
      ...receptionData,
      createdBy: userId,
    }

    const newReceptionResult = await createReception(finalPayload)

    if (!newReceptionResult.success) {
      return NextResponse.json(
        { message: newReceptionResult.message },
        { status: 400 }
      )
    }

    if (isFinal) {
      const receptionId = newReceptionResult.data._id.toString()
      const confirmationResult = await confirmReception(receptionId)

      if (!confirmationResult.success) {
        return NextResponse.json(
          {
            message: `Recepția a fost salvată ca ciornă, dar finalizarea a eșuat: ${confirmationResult.message}`,
            data: newReceptionResult.data,
          },
          { status: 400 }
        )
      }
      return NextResponse.json(confirmationResult.data, { status: 200 })
    }

    return NextResponse.json(newReceptionResult.data, { status: 201 })
    //eslint-disable-next-line
  } catch (error: any) {
    if (error.type === 'CredentialsSignin') {
      return NextResponse.json(
        { message: 'Credentiale invalide' },
        { status: 401 }
      )
    }
    // Verificăm dacă este o eroare din NextAuth.js
    if (error.name === 'AuthSessionError') {
      return NextResponse.json(
        { message: 'Eroare de sesiune' },
        { status: 401 }
      )
    }

    console.error('[RECEPTIONS_POST_ERROR]', error)
    return NextResponse.json(
      { message: error.message || 'A apărut o eroare internă' },
      { status: 500 }
    )
  }
}
