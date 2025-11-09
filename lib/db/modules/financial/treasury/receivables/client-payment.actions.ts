'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
// FIX 1: Am scos importul 'IInvoiceDoc' care nu era folosit
import InvoiceModel from '../../../financial/invoices/invoice.model'
import ClientPaymentModel from './client-payment.model'
import PaymentAllocationModel from './payment-allocation.model'
import { round2 } from '@/lib/utils'
// FIX 2: Am scos importul 'connectToDatabase' care nu era folosit
import {
  CreateClientPaymentInput,
  ClientPaymentDTO,
  IClientPaymentDoc, // <-- FIX 3: Am ADĂUGAT importul lipsă
} from './client-payment.types'
import { CreateClientPaymentSchema } from './client-payment.validator'
import { generateNextDocumentNumber } from '../../../numbering/numbering.actions'
import { revalidatePath } from 'next/cache'

type PaymentActionResult = {
  success: boolean
  message: string
  data?: ClientPaymentDTO
}

/**
 * Înregistrează o nouă încasare de la un client.
 * Această funcție va încerca automat să aloce suma încasată
 * celor mai vechi facturi neplătite (FIFO) ale clientului.
 */
export async function createClientPayment(
  data: CreateClientPaymentInput
): Promise<PaymentActionResult> {
  const session = await startSession()
  // Acum 'IClientPaymentDoc' este un tip cunoscut
  let newPaymentDoc: IClientPaymentDoc | null = null

  try {
    newPaymentDoc = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateClientPaymentSchema.parse(data)

      // 2. Generare Număr Document (Atomic)
      const nextSeq = await generateNextDocumentNumber(
        validatedData.seriesName,
        {
          session,
        }
      )
      const paymentNumber = `${validatedData.seriesName}-${String(
        nextSeq
      ).padStart(5, '0')}`

      // 3. Crearea Încasării (Model 1: ClientPayment)
      const [newPayment] = await ClientPaymentModel.create(
        [
          {
            ...validatedData,
            paymentNumber: paymentNumber,
            sequenceNumber: nextSeq,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session }
      )

      let currentUnallocated = newPayment.totalAmount
      if (currentUnallocated <= 0) {
        return newPayment // Nu avem ce aloca, returnăm plata
      }

      // 4. --- LOGICA DE ALOCARE AUTOMATĂ (FIFO) ---
      const invoicesToPay = await InvoiceModel.find({
        clientId: validatedData.clientId,
        status: { $in: ['APPROVED', 'REJECTED', 'CREATED'] },
        remainingAmount: { $gt: 0 },
      })
        .sort({ dueDate: 1 }) // FIFO
        .session(session)

      for (const invoice of invoicesToPay) {
        if (currentUnallocated <= 0) {
          break
        }

        const remainingOnInvoice = invoice.remainingAmount
        let amountToAllocate = 0

        if (currentUnallocated >= remainingOnInvoice) {
          amountToAllocate = remainingOnInvoice
        } else {
          amountToAllocate = currentUnallocated
        }

        amountToAllocate = round2(amountToAllocate)

        // 5. Crearea Alocării (Model 2: PaymentAllocation)
        await PaymentAllocationModel.create(
          [
            {
              paymentId: newPayment._id,
              invoiceId: invoice._id,
              amountAllocated: amountToAllocate,
              allocationDate: validatedData.paymentDate,
              createdBy: new Types.ObjectId(userId),
              createdByName: userName,
            },
          ],
          { session }
        )

        // 6. Actualizarea Facturii (Logica din vechiul tău fișier)
        invoice.paidAmount = round2(invoice.paidAmount + amountToAllocate)
        invoice.remainingAmount = round2(
          invoice.remainingAmount - amountToAllocate
        )

        if (invoice.remainingAmount <= 0.001) {
          invoice.status = 'PAID'
          invoice.remainingAmount = 0 // Curățăm
        }
        await invoice.save({ session })

        // 7. Actualizăm suma rămasă de alocat din încasare
        currentUnallocated = round2(currentUnallocated - amountToAllocate)
      }

      // 8. Actualizarea Finală a Încasării (ClientPayment)
      newPayment.unallocatedAmount = currentUnallocated
      return await newPayment.save({ session })
    })

    await session.endSession()

    if (!newPaymentDoc) {
      throw new Error('Tranzacția nu a returnat un document de plată.')
    }

    revalidatePath('/financial/invoices')
    revalidatePath('/incasari-si-plati') 
    revalidatePath(`/clients/${newPaymentDoc.clientId.toString()}`)

    return {
      success: true,
      message: `Încasarea ${newPaymentDoc.paymentNumber} de ${newPaymentDoc.totalAmount} RON a fost salvată.`,
      data: JSON.parse(JSON.stringify(newPaymentDoc)),
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare createClientPayment:', error)
    return { success: false, message: (error as Error).message }
  }
}
