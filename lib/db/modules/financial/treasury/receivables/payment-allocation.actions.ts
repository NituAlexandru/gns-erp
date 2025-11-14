'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import InvoiceModel from '../../../financial/invoices/invoice.model'
import ClientPaymentModel from './client-payment.model'
import PaymentAllocationModel from './payment-allocation.model'
import { round2 } from '@/lib/utils'
import {
  CreatePaymentAllocationInput,
  IPaymentAllocationDoc,
} from './payment-allocation.types'
import { CreatePaymentAllocationSchema } from './payment-allocation.validator'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/db'

// Tipul de răspuns pentru acțiunile de alocare
type AllocationActionResult = {
  success: boolean
  message: string
  data?: PopulatedAllocation
}

export type PopulatedAllocation = IPaymentAllocationDoc & {
  invoiceId: {
    _id: Types.ObjectId
    seriesName: string
    invoiceNumber: string
  }
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
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreatePaymentAllocationSchema.parse(data)
      const { paymentId, invoiceId, amountAllocated, allocationDate } =
        validatedData

      const payment =
        await ClientPaymentModel.findById(paymentId).session(session)
      const invoice = await InvoiceModel.findById(invoiceId).session(session)

      if (!payment) throw new Error('Încasarea sursă nu a fost găsită.')
      if (!invoice) throw new Error('Factura țintă nu a fost găsită.')
      if (invoice.status === 'PAID')
        throw new Error('Factura este deja marcată ca "Plătită".')

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

      // 4. Crearea Alocării
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

      // 5. Actualizare Încasare
      payment.unallocatedAmount = round2(
        payment.unallocatedAmount - roundedAmount
      )
      await payment.save({ session })

      // 6. Actualizare Factură
      invoice.paidAmount = round2(invoice.paidAmount + roundedAmount)
      invoice.remainingAmount = round2(invoice.remainingAmount - roundedAmount)
      await invoice.save({ session })

      return createdAllocation
    })

    await session.endSession()

    if (!newAllocation) {
      throw new Error('Tranzacția nu a returnat o alocare.')
    }

    revalidatePath(`/financial/invoices/${newAllocation.invoiceId.toString()}`)
    revalidatePath('/admin/management/incasari-si-plati/receivables')
    revalidatePath('/clients')

    const populatedAllocation = await PaymentAllocationModel.findById(
      newAllocation._id
    )
      .populate({
        path: 'invoiceId',
        model: InvoiceModel,
        select: 'invoiceNumber seriesName',
      })
      .lean()

    return {
      success: true,
      message: 'Alocarea a fost salvată cu succes.',
      data: JSON.parse(
        JSON.stringify(populatedAllocation)
      ) as PopulatedAllocation,
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
 */
export async function deleteAllocation(
  allocationId: string
): Promise<Omit<AllocationActionResult, 'data'>> {
  const session = await startSession()

  try {
    await session.withTransaction(async (session) => {
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')
      if (!Types.ObjectId.isValid(allocationId))
        throw new Error('ID Alocare invalid.')

      const allocation =
        await PaymentAllocationModel.findById(allocationId).session(session)
      if (!allocation) throw new Error('Alocarea nu a fost găsită.')

      const amountToReverse = allocation.amountAllocated

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
      if (invoice.status === 'CANCELLED') {
        throw new Error('Nu se poate anula o alocare de pe o factură anulată.')
      }

      // Reversează actualizarea pe Încasare
      payment.unallocatedAmount = round2(
        payment.unallocatedAmount + amountToReverse
      )
      await payment.save({ session })

      // Reversează actualizarea pe Factură
      invoice.paidAmount = round2(invoice.paidAmount - amountToReverse)
      invoice.remainingAmount = round2(
        invoice.remainingAmount + amountToReverse
      )

      await invoice.save({ session })

      // Șterge Alocarea
      await PaymentAllocationModel.findByIdAndDelete(allocationId).session(
        session
      )
    })

    await session.endSession()

    revalidatePath('/financial/invoices')
    revalidatePath('/admin/management/incasari-si-plati/receivables')
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

// --- FUNCȚIA 1: PENTRU A VEDEA CE E DEJA ALOCAT ---
export async function getAllocationsForPayment(paymentId: string) {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new Error('ID Încasare invalid.')
    }

    const allocations = await PaymentAllocationModel.find({
      paymentId: new Types.ObjectId(paymentId),
    })
      .populate({
        path: 'invoiceId',
        model: InvoiceModel,
        select: 'invoiceNumber seriesName',
      })
      .sort({ createdAt: -1 })
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allocations)),
    }
  } catch (error) {
    console.error('❌ Eroare getAllocationsForPayment:', error)
    return { success: false, data: [], message: (error as Error).message }
  }
}

// --- FUNCȚIA 2: PENTRU A VEDEA CE SE POATE ALOCA ---
export async function getUnpaidInvoicesByClient(clientId: string) {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(clientId)) {
      throw new Error('ID Client invalid.')
    }

    const invoices = await InvoiceModel.find({
      clientId: new Types.ObjectId(clientId),
      status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
      remainingAmount: { $gt: 0 },
    })
      .sort({ dueDate: 1 }) // Ordonăm FIFO
      .select(
        'invoiceNumber seriesName dueDate remainingAmount totals.grandTotal'
      )
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(invoices)),
    }
  } catch (error) {
    console.error('❌ Eroare getUnpaidInvoicesByClient:', error)
    return { success: false, data: [], message: (error as Error).message }
  }
}
