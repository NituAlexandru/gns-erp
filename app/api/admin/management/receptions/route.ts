import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  createReception,
  confirmReception,
  deleteReception,
} from '@/lib/db/modules/reception/reception.actions'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizat' }, { status: 401 })
    }
    const userId = session.user.id
    const body = await request.json()
    const { isFinal, ...receptionData } = body

    const finalPayload = {
      ...receptionData,
      createdBy: userId,
    }

    if (isFinal) {
      // --- Logică nouă pentru CONFIRMARE cu mecanism de curățenie ---

      // Pasul 1: Creăm recepția ca DRAFT
      const newReceptionResult = await createReception(finalPayload)

      if (!newReceptionResult.success) {
        // Dacă nici măcar crearea draft-ului nu reușește, returnăm eroare
        return NextResponse.json(
          { message: newReceptionResult.message },
          { status: 400 }
        )
      }

      const receptionId = newReceptionResult.data._id.toString()

      try {
        // Pasul 2: Încercăm să confirmăm
        const confirmationResult = await confirmReception({
          receptionId,
          userId,
        })

        if (!confirmationResult.success) {
          // Dacă confirmarea eșuează, aruncăm o eroare pentru a intra în `catch`
          throw new Error(confirmationResult.message)
        }

        // Dacă totul a fost ok, returnăm succes
        return NextResponse.json(confirmationResult.data, { status: 200 })
      } catch (error) {
        // Pasul 3: A apărut o eroare la confirmare, deci ștergem draft-ul creat
        console.error('Confirmarea a eșuat, se șterge draft-ul:', error)
        await deleteReception(receptionId)

        // Returnăm eroarea originală de la confirmare
        const message =
          error instanceof Error ? error.message : 'Eroare la confirmare.'
        return NextResponse.json({ message }, { status: 400 })
      }
    } else {
      // --- Logică neschimbată pentru SALVARE DRAFT ---
      const newReceptionResult = await createReception(finalPayload)
      if (!newReceptionResult.success) {
        return NextResponse.json(
          { message: newReceptionResult.message },
          { status: 400 }
        )
      }
      return NextResponse.json(newReceptionResult.data, { status: 201 })
    }
  } catch (error: unknown) {
    // Am înlocuit 'any' cu 'unknown'
    console.error('[RECEPTIONS_POST_ERROR]', error)

    // Verificăm dacă eroarea este un obiect și are proprietățile necesare
    if (typeof error === 'object' && error !== null) {
      if ('type' in error && error.type === 'CredentialsSignin') {
        return NextResponse.json(
          { message: 'Credentiale invalide' },
          { status: 401 }
        )
      }
      if ('name' in error && error.name === 'AuthSessionError') {
        return NextResponse.json(
          { message: 'Eroare de sesiune' },
          { status: 401 }
        )
      }
    }

    // Verificăm dacă eroarea este o instanță a clasei Error
    // pentru a putea accesa proprietatea 'message' în siguranță.
    const message =
      error instanceof Error
        ? error.message
        : 'A apărut o eroare internă neașteptată.'

    return NextResponse.json({ message }, { status: 500 })
  }
}
