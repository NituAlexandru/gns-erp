'use server'

import { connectToDatabase } from '@/lib/db'
import ClientReceiptCounter from './model'
import ClientPaymentModel from '@/lib/db/modules/financial/treasury/receivables/client-payment.model'
import { ClientSession, Types } from 'mongoose'

/**
 * 1. PEEK INTELIGENT:
 * Returnează primul număr DISPONIBIL care este mai mare decât contorul actual.
 * Sare peste numerele care există deja (făcute manual).
 */
export async function getNextClientReceiptNumberPreview(
  clientId: string,
): Promise<string> {
  try {
    if (!clientId || !Types.ObjectId.isValid(clientId)) return ''

    await connectToDatabase()
    const currentYear = new Date().getFullYear()

    // 1. Aflăm unde am rămas cu contorul (ex: 17)
    const counterDoc = await ClientReceiptCounter.findOne({
      clientId: new Types.ObjectId(clientId),
      year: currentYear,
    })

    // Ultimul număr "oficial" generat. Dacă nu există, e 0.
    const lastOfficialNumber = counterDoc ? counterDoc.currentNumber : 0

    // 2. Începem să căutăm următorul liber începând de la lastOfficialNumber + 1
    let candidate = lastOfficialNumber + 1
    let isFound = false

    // Căutăm în buclă până găsim un loc liber
    // (Optimizare: Pentru a nu face 100 de query-uri dacă ai 100 de numere manuale,
    // am putea lua toate id-urile > candidate, dar pentru simplitate și safety, while-ul e ok aici
    // fiindcă rar ai mii de numere manuale consecutive).
    while (!isFound) {
      // Formăm string-ul cu padding pentru căutare (ex: "00018")
      // Presupunem că în baza de date paymentNumber e stocat ca string cu padding.
      // Dacă e stocat ca number sau string simplu, adaptează aici.
      // Aici verificăm varianta "exact cum o scriem noi"
      const candidateString = String(candidate).padStart(4, '0')

      const exists = await ClientPaymentModel.exists({
        clientId: new Types.ObjectId(clientId),
        // year: currentYear, // Uncomment dacă ai câmpul year pe plăți și vrei unicitate per an
        paymentNumber: candidateString,
      })

      if (exists) {
        // Numărul 18 e ocupat manual -> trecem la 19
        candidate++
      } else {
        // Numărul 19 e liber -> Îl returnăm pe ăsta
        isFound = true
      }
    }

    return String(candidate).padStart(4, '0')
  } catch (error) {
    console.error('Err getting client receipt preview:', error)
    return ''
  }
}

/**
 * 2. UPDATE CONDITIONAT:
 * Actualizează contorul DOAR dacă numărul salvat este mai mare decât ce știam noi.
 * Folosit pentru a "sări" peste numerele ocupate când ajungem la ele.
 */
export async function updateClientReceiptCounter(
  clientId: string,
  newNumber: number, // Numărul care tocmai s-a salvat (ex: 19)
  options: { session?: ClientSession } = {},
): Promise<void> {
  try {
    if (!clientId) return

    await connectToDatabase()
    const currentYear = new Date().getFullYear()

    await ClientReceiptCounter.findOneAndUpdate(
      {
        clientId: new Types.ObjectId(clientId),
        year: currentYear,
      },
      [
        {
          $set: {
            currentNumber: {
              $cond: {
                if: { $gt: [newNumber, { $ifNull: ['$currentNumber', 0] }] },
                then: newNumber,
                else: { $ifNull: ['$currentNumber', 0] },
              },
            },
          },
        },
      ],
      {
        new: true,
        upsert: true,
        session: options.session,
      },
    )
  } catch (error) {
    console.error('Err updating client receipt number:', error)
  }
}
