'use server'

import { startSession, Types, ClientSession } from 'mongoose'
import { auth } from '@/auth'
import { connectToDatabase } from '@/lib/db' 
import { generateNextDocumentNumber } from '../../numbering/numbering.actions'
import ReturnNoteModel from './return-note.model'
import {
  CreateReturnNoteInput,
  ReturnNoteActionResult,
  ReturnNoteDTO,
} from './return-note.types' 
import { CreateReturnNoteSchema } from './return-note.validator' 
import { formatError } from '@/lib/utils'
import { recordStockMovement } from '../../inventory/inventory.actions'

export async function createReturnNote(
  data: CreateReturnNoteInput,
  status: 'DRAFT' | 'COMPLETED',
  session?: ClientSession
): Promise<ReturnNoteActionResult> {
  await connectToDatabase()

  const process = async (session: ClientSession) => {
    // 1. Validare
    const validatedData = CreateReturnNoteSchema.parse(data)

    // 2. Autentificare
    const authSession = await auth()
    const userId = authSession?.user?.id
    const userName = authSession?.user?.name
    if (!userId || !userName) throw new Error('Utilizator neautentificat.')

    // 3. Generare Număr
    const year = validatedData.returnNoteDate.getFullYear()
    const nextSeq = await generateNextDocumentNumber(validatedData.seriesName, {
      session,
    })
    const returnNoteNumber = `${validatedData.seriesName}-${String(
      nextSeq
    ).padStart(5, '0')}`

    // 4. Salvare Document (inițial)
    const [newReturnNote] = await ReturnNoteModel.create(
      [
        {
          ...validatedData,
          sequenceNumber: nextSeq,
          returnNoteNumber: returnNoteNumber,
          year: year,
          status: status,
          createdBy: new Types.ObjectId(userId),
          createdByName: userName,
          completedBy:
            status === 'COMPLETED' ? new Types.ObjectId(userId) : undefined,
          completedByName: status === 'COMPLETED' ? userName : undefined,
          completedAt: status === 'COMPLETED' ? new Date() : undefined,
        },
      ],
      { session }
    )

    if (!newReturnNote) {
      throw new Error('Nu s-a putut crea nota de retur.')
    }

    // 5. --- MIȘCAREA STOCULUI (DOAR DACĂ E FINALIZATĂ) ---
    if (status === 'COMPLETED') {
      for (const item of newReturnNote.items) {
        // Calculăm costul mediu al intrării (bazat pe ieșirea originală)
        // `unitCost` este deja stocat pe linie de validator
        const returnCost = item.unitCost

        if (returnCost === undefined || returnCost < 0) {
          throw new Error(
            `Costul de retur pentru ${item.productName} este invalid.`
          )
        }

        // Apelăm funcția ta existentă de inventar
        await recordStockMovement(
          {
            stockableItem: item.productId.toString(),
            stockableItemType: item.stockableItemType,
            movementType: 'RETUR_CLIENT', // Tip de INTRARE
            quantity: item.quantityInBaseUnit, 
            unitMeasure: item.baseUnit,
            locationTo: validatedData.locationTo,
            referenceId: newReturnNote._id.toString(), // Legătura cu această Notă de Retur
            note: `Retur client cf. NR ${returnNoteNumber}`,
            unitCost: returnCost, // Acesta este costul original de ieșire
            responsibleUser: userId,
            timestamp: new Date(),
          },
          session
        )
      }
    }

    const message =
      status === 'DRAFT'
        ? `Nota de retur ${returnNoteNumber} a fost creată ca ciornă.`
        : `Nota de retur ${returnNoteNumber} a fost finalizată și stocul a fost actualizat.`

    return {
      success: true,
      message: message,
      data: JSON.parse(JSON.stringify(newReturnNote)) as ReturnNoteDTO,
    }
  }

  // --- Gestionarea Tranzacției ---
  if (session) {
    return process(session)
  } else {
    const newSession = await startSession()
    try {
      let result: ReturnNoteActionResult | undefined
      await newSession.withTransaction(async (transactionSession) => {
        result = await process(transactionSession)
      })

      if (!result) throw new Error('Tranzacția a eșuat.')
      await newSession.endSession() // Închidem sesiunea aici
      return result
    } catch (error) {
      if (newSession.inTransaction()) {
        // Verificăm dacă e încă activă
        await newSession.abortTransaction()
      }
      await newSession.endSession()
      console.error('❌ Eroare createReturnNote:', error)
      return { success: false, message: formatError(error) }
    }
  }
}
