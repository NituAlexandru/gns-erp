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

    // 1. Verificăm mai întâi dacă crearea a eșuat.
    if (!newReceptionResult.success) {
      return NextResponse.json(
        { message: newReceptionResult.message },
        { status: 400 }
      )
    }

    // 2. Acum știm sigur că avem succes. Extragem datele într-o variabilă sigură.
    const reception = newReceptionResult.data

    // 3. Verificăm dacă trebuie să și confirmăm recepția.
    if (isFinal) {
      const receptionId = reception._id.toString()
      const confirmationResult = await confirmReception(receptionId)

      if (confirmationResult.success) {
        // Dacă a avut succes confirmarea, returnăm datele confirmate
        return NextResponse.json(confirmationResult.data, { status: 200 })
      } else {
        // Dacă a eșuat confirmarea, returnăm mesajul de eroare
        return NextResponse.json(
          { message: confirmationResult.message },
          { status: 400 }
        )
      }
    }

    // 4. Dacă nu este "isFinal", înseamnă că doar am salvat ciorna.
    // Returnăm direct datele recepției create.
    return NextResponse.json(reception, { status: 201 })
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
