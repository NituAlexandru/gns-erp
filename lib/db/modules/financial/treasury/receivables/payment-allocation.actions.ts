'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import InvoiceModel from '../../../financial/invoices/invoice.model'
import ClientPaymentModel from './client-payment.model'
import PaymentAllocationModel from './payment-allocation.model'
import { round2 } from '@/lib/utils'
import {
  CreatePaymentAllocationInput,
  PaymentAllocationDTO,
  IPaymentAllocationDoc, // <-- FIX 1: Importăm tipul corect
} from './payment-allocation.types'
import { CreatePaymentAllocationSchema } from './payment-allocation.validator'
// IClientPaymentDoc nu mai e necesar aici, îl scoatem dacă vrem
// import { IClientPaymentDoc } from './client-payment.types'
import { revalidatePath } from 'next/cache'

// Tipul de răspuns pentru acțiunile de alocare
type AllocationActionResult = {
  success: boolean
  message: string
  data?: PaymentAllocationDTO
}

/**
 * Creează o alocare manuală.
 * Leagă o sumă dintr-o Încasare (ClientPayment) de o Factură (Invoice).
 */
export async function createManualAllocation(
  data: CreatePaymentAllocationInput
): Promise<AllocationActionResult> {
  const session = await startSession()
  let newAllocation: IPaymentAllocationDoc | null = null

  try {
    newAllocation = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreatePaymentAllocationSchema.parse(data)
      const { paymentId, invoiceId, amountAllocated, allocationDate } =
        validatedData

      // 2. Găsire documente
      // FIX 2: Am șters cast-ul 'as IClientPaymentDoc | null'
      const payment =
        await ClientPaymentModel.findById(paymentId).session(session)
      // FIX 2: Am șters cast-ul 'as IInvoiceDoc | null'
      const invoice = await InvoiceModel.findById(invoiceId).session(session)

      // 3. Validări de Business
      if (!payment) throw new Error('Încasarea sursă nu a fost găsită.')
      if (!invoice) throw new Error('Factura țintă nu a fost găsită.')
      if (invoice.status === 'PAID')
        throw new Error('Factura este deja marcată ca "Plătită".')

      // Verifică dacă suma de alocat este validă
      const roundedAmount = round2(amountAllocated)
      if (roundedAmount > round2(payment.unallocatedAmount)) {
        throw new Error(
          `Suma de alocat (${roundedAmount}) este mai mare decât suma nealocată din încasare (${payment.unallocatedAmount}).`
        )
      }
      if (roundedAmount > round2(invoice.remainingAmount)) {
        throw new Error(
          `Suma de alocat (${roundedAmount}) este mai mare decât restul de plată al facturii (${invoice.remainingAmount}).`
        )
      }

      // 4. Crearea Alocării (Model 2)
      const [createdAllocation] = await PaymentAllocationModel.create(
        [
          {
            paymentId: payment._id,
            invoiceId: invoice._id,
            amountAllocated: roundedAmount,
            allocationDate: allocationDate,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session }
      )

      // 5. Actualizare Încasare (Model 1)
      payment.unallocatedAmount = round2(
        payment.unallocatedAmount - roundedAmount
      )
      await payment.save({ session }) // <-- Acum .save() funcționează

      // 6. Actualizare Factură (Logica din vechiul tău cod)
      invoice.paidAmount = round2(invoice.paidAmount + roundedAmount)
      invoice.remainingAmount = round2(invoice.remainingAmount - roundedAmount)

      if (invoice.remainingAmount <= 0.001) {
        invoice.status = 'PAID'
        invoice.remainingAmount = 0
      } else {
        if (invoice.status !== 'APPROVED') {
          invoice.status = 'APPROVED'
        }
      }
      await invoice.save({ session }) // <-- Acum .save() funcționează

      return createdAllocation
    })

    await session.endSession()

    if (!newAllocation) {
      throw new Error('Tranzacția nu a returnat o alocare.')
    }

    // Revalidare căi
    revalidatePath(`/financial/invoices/${newAllocation.invoiceId.toString()}`)
    revalidatePath('/incasari-si-plati')
    // Aici nu avem clientId, dar revalidăm pagina generală
    revalidatePath('/clients')

    return {
      success: true,
      message: 'Alocarea a fost salvată cu succes.',
      data: JSON.parse(JSON.stringify(newAllocation)),
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare createManualAllocation:', error)
    return { success: false, message: (error as Error).message }
  }
}

/**
 * Șterge o alocare specifică.
 * Returnează banii în Încasare (unallocatedAmount)
 * și recreează datoria pe Factură (remainingAmount).
 */
export async function deleteAllocation(
  allocationId: string
): Promise<Omit<AllocationActionResult, 'data'>> {
  const session = await startSession()

  try {
    await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')

      if (!Types.ObjectId.isValid(allocationId))
        throw new Error('ID Alocare invalid.')

      // 2. Găsește Alocarea
      const allocation =
        await PaymentAllocationModel.findById(allocationId).session(session)
      if (!allocation) throw new Error('Alocarea nu a fost găsită.')

      const amountToReverse = allocation.amountAllocated

      // 3. Găsește documentele părinte
      const payment = await ClientPaymentModel.findById(
        allocation.paymentId
      ).session(session)
   
      const invoice = await InvoiceModel.findById(allocation.invoiceId).session(
        session
      )

      if (!payment || !invoice) {
        throw new Error(
          'Date corupte. Factura sau Încasarea aferentă nu au fost găsite.'
        )
      }

      // 4. Validare Business
      if (invoice.status === 'CANCELLED') {
        throw new Error('Nu se poate anula o alocare de pe o factură anulată.')
      }

      // 5. Reversează actualizarea pe Încasare (Model 1)
      payment.unallocatedAmount = round2(
        payment.unallocatedAmount + amountToReverse
      )
      await payment.save({ session }) // <-- Acum .save() funcționează

      // 6. Reversează actualizarea pe Factură
      invoice.paidAmount = round2(invoice.paidAmount - amountToReverse)
      invoice.remainingAmount = round2(
        invoice.remainingAmount + amountToReverse
      )

      if (invoice.status === 'PAID') {
        invoice.status = 'APPROVED'
      }
      await invoice.save({ session }) // <-- Acum .save() funcționează

      // 7. Șterge Alocarea (Model 2)
      await PaymentAllocationModel.findByIdAndDelete(allocationId).session(
        session
      )

      return true // Succesul tranzacției
    })

    await session.endSession()

    // Revalidare căi
    revalidatePath('/financial/invoices')
    revalidatePath('/incasari-si-plati')
    revalidatePath('/clients')

    return {
      success: true,
      message: 'Alocarea a fost ștearsă cu succes.',
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare deleteAllocation:', error)
    return { success: false, message: (error as Error).message }
  }
}
