'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import SupplierInvoiceModel from './supplier-invoice.model'
import SupplierPaymentModel from './supplier-payment.model'
import SupplierAllocationModel from './supplier-allocation.model'
import { round2 } from '@/lib/utils'
import {
  CreateSupplierPaymentInput,
  SupplierPaymentDTO,
  ISupplierPaymentDoc,
} from './supplier-payment.types'
import { CreateSupplierPaymentSchema } from './supplier-payment.validator'
import { generateNextDocumentNumber } from '../../../numbering/numbering.actions'
import { revalidatePath } from 'next/cache'

type PaymentActionResult = {
  success: boolean
  message: string
  data?: SupplierPaymentDTO
}

/**
 * Înregistrează o nouă plată către un furnizor.
 * Va încerca automat să aloce suma plătită
 * celor mai vechi facturi neplătite (FIFO) ale furnizorului.
 */
export async function createSupplierPayment(
  data: CreateSupplierPaymentInput
): Promise<PaymentActionResult> {
  const session = await startSession()
  let newPaymentDoc: ISupplierPaymentDoc | null = null

  try {
    newPaymentDoc = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateSupplierPaymentSchema.parse(data)

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

      // 3. Crearea Plății (Model 4: SupplierPayment)
      // Hook-ul pre('save') va seta 'unallocatedAmount' = 'totalAmount'
      const [newPayment] = await SupplierPaymentModel.create(
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
      // Găsim cele mai vechi facturi ale furnizorului care sunt 'NEPLATITE'
      const invoicesToPay = await SupplierInvoiceModel.find({
        supplierId: validatedData.supplierId,
        status: 'NEPLATITA', // Căutăm doar facturile care nu sunt deja plătite
        remainingAmount: { $gt: 0 },
      })
        .sort({ dueDate: 1 }) // FIFO (cea mai veche scadență prima)
        .session(session)

      for (const invoice of invoicesToPay) {
        if (currentUnallocated <= 0) {
          break // Am terminat de alocat toți banii
        }

        const remainingOnInvoice = invoice.remainingAmount
        let amountToAllocate = 0

        if (currentUnallocated >= remainingOnInvoice) {
          amountToAllocate = remainingOnInvoice
        } else {
          amountToAllocate = currentUnallocated
        }

        amountToAllocate = round2(amountToAllocate)

        // 5. Crearea Alocării (Model 5: SupplierAllocation)
        await SupplierAllocationModel.create(
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

        // 6. Actualizarea Facturii Furnizor (Model 3)
        invoice.paidAmount = round2(invoice.paidAmount + amountToAllocate)
        invoice.remainingAmount = round2(
          invoice.remainingAmount - amountToAllocate
        )

        if (invoice.remainingAmount <= 0.001) {
          invoice.status = 'PLATITA_COMPLET'
          invoice.remainingAmount = 0
        } else {
          invoice.status = 'PLATITA_PARTIAL' // S-a plătit o parte
        }
        await invoice.save({ session })

        // 7. Actualizăm suma rămasă de alocat din plata noastră
        currentUnallocated = round2(currentUnallocated - amountToAllocate)
      }

      // 8. Actualizarea Finală a Plății (SupplierPayment)
      newPayment.unallocatedAmount = currentUnallocated
      // Hook-ul pre('save') va seta automat statusul corect
      return await newPayment.save({ session })
    })

    await session.endSession()

    if (!newPaymentDoc) {
      throw new Error('Tranzacția nu a returnat un document de plată.')
    }

    revalidatePath('/incasari-si-plati/payables') // Pagina principală a modulului
    revalidatePath(`/suppliers/${newPaymentDoc.supplierId.toString()}`)

    return {
      success: true,
      message: `Plata ${newPaymentDoc.paymentNumber} de ${newPaymentDoc.totalAmount} RON a fost salvată.`,
      data: JSON.parse(JSON.stringify(newPaymentDoc)),
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare createSupplierPayment:', error)
    return { success: false, message: (error as Error).message }
  }
}

// TODO: Adaugă aici 'getSupplierPayments' (pentru listare)
