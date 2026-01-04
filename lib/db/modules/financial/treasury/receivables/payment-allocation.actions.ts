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
import { ClientPaymentDTO, IClientPaymentDoc } from './client-payment.types'
import { recalculateClientSummary } from '../../../client/summary/client-summary.actions'

// Tipul de răspuns pentru acțiunile de alocare
type AllocationActionResult = {
  success: boolean
  message: string
  data?: PopulatedAllocation
  updatedPayment?: ClientPaymentDTO
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
): Promise<{
  success: boolean
  message: string
  data?: PopulatedAllocation
  updatedPayment?: ClientPaymentDTO
}> {
  const session = await startSession()
  let newAllocation: IPaymentAllocationDoc | null = null
  let updatedPaymentDoc: IClientPaymentDoc | null = null

  // Variabilă pentru recalculare
  let clientIdToRecalc = ''

  try {
    // Executăm tranzacția și capturăm rezultatele
    const transactionResult = await session.withTransaction(async (session) => {
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

      // SALVĂM CLIENT ID
      clientIdToRecalc = payment.clientId.toString()

      if (!invoice) throw new Error('Factura țintă nu a fost găsită.')
      if (invoice.status === 'PAID')
        throw new Error('Factura este deja marcată ca "Plătită".')

      const roundedAmount = round2(amountAllocated)
      const currentUnallocated = round2(payment.unallocatedAmount)
      const invoiceRemaining = round2(invoice.remainingAmount)

      // --- VALIDĂRI ---
      if (roundedAmount > 0) {
        if (roundedAmount > currentUnallocated)
          throw new Error(`Fonduri insuficiente în încasare.`)
        if (roundedAmount > invoiceRemaining)
          throw new Error(`Depășește restul de plată al facturii.`)
      } else {
        if (roundedAmount < invoiceRemaining)
          throw new Error(`Depășește valoarea de stornat a facturii.`)
      }

      // 1. Crearea Alocării
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

      // 2. Actualizare Încasare
      payment.unallocatedAmount = round2(
        payment.unallocatedAmount - roundedAmount
      )
      const savedPayment = await payment.save({ session })

      // 3. Actualizare Factură
      invoice.paidAmount = round2(invoice.paidAmount + roundedAmount)
      invoice.remainingAmount = round2(invoice.remainingAmount - roundedAmount)
      await invoice.save({ session })

      return { createdAllocation, savedPayment }
    })

    newAllocation = transactionResult.createdAllocation
    updatedPaymentDoc = transactionResult.savedPayment

    await session.endSession()

    if (!newAllocation) {
      throw new Error('Tranzacția nu a returnat o alocare.')
    }

    if (clientIdToRecalc) {
      try {
        await recalculateClientSummary(clientIdToRecalc, 'auto-recalc', true)
      } catch (err) {
        console.error('Eroare recalculare sold (create allocation):', err)
      }
    }

    revalidatePath(`/financial/invoices`)
    revalidatePath('/admin/management/incasari-si-plati/receivables')
    revalidatePath('/clients')

    const populatedAllocation = await PaymentAllocationModel.findById(
      (newAllocation as IPaymentAllocationDoc)._id
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
      updatedPayment: JSON.parse(JSON.stringify(updatedPaymentDoc)),
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

  // Variabilă pentru recalculare
  let clientIdToRecalc = ''

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

      // SALVĂM ID
      clientIdToRecalc = payment.clientId.toString()

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

    // --- RECALCULARE SOLD ---
    if (clientIdToRecalc) {
      try {
        await recalculateClientSummary(clientIdToRecalc, 'auto-recalc', true)
      } catch (err) {
        console.error('Eroare recalculare sold (delete allocation):', err)
      }
    }
    // ------------------------

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

// ---  PENTRU A VEDEA CE E DEJA ALOCAT ---
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

// ---  PENTRU A VEDEA CE SE POATE ALOCA ---
export async function getUnpaidInvoicesByClient(clientId: string) {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(clientId)) {
      throw new Error('ID Client invalid.')
    }

    const invoices = await InvoiceModel.find({
      clientId: new Types.ObjectId(clientId),
      status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
      remainingAmount: { $ne: 0 },
      seriesName: { $ne: 'INIT-AMB' },
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
export async function getAllocationsForInvoice(invoiceId: string) {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new Error('ID Factură invalid.')
    }

    const allocations = await PaymentAllocationModel.find({
      invoiceId: new Types.ObjectId(invoiceId),
    })
      .populate({
        path: 'paymentId',
        model: ClientPaymentModel,
        select: 'paymentNumber seriesName paymentDate',
      })
      .sort({ allocationDate: 1 })
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allocations)),
    }
  } catch (error) {
    console.error('❌ Eroare getAllocationsForInvoice:', error)
    return { success: false, data: [], message: (error as Error).message }
  }
}
export async function createCompensationPayment(
  invoiceId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  const session = await startSession()

  // Variabilă pentru recalculare
  let clientIdToRecalc = ''

  try {
    await session.withTransaction(async (session) => {
      // 1. Găsim factura negativă
      const invoice = await InvoiceModel.findById(invoiceId).session(session)
      if (!invoice) throw new Error('Factura nu a fost găsită.')

      // SALVĂM ID
      clientIdToRecalc = invoice.clientId.toString()

      if (invoice.remainingAmount >= 0) {
        throw new Error(
          'Această funcție este doar pentru facturi negative (Discount/Storno).'
        )
      }

      const absAmount = Math.abs(invoice.remainingAmount)

      // 2. Creăm "Încasarea" de Compensare
      const [compensationPayment] = await ClientPaymentModel.create(
        [
          {
            paymentNumber: `COMP-${invoice.invoiceNumber}`,
            seriesName: 'INTERNA',
            clientId: invoice.clientId,
            paymentDate: new Date(),
            paymentMethod: 'COMPENSARE',
            totalAmount: 0,
            unallocatedAmount: 0,
            referenceDocument: `Compensare Factura seria ${invoice.seriesName} nr. ${invoice.invoiceNumber}`,
            status: 'NEALOCATA',
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session }
      )

      // 3. Creăm alocarea negativă
      await PaymentAllocationModel.create(
        [
          {
            paymentId: compensationPayment._id,
            invoiceId: invoice._id,
            amountAllocated: invoice.remainingAmount,
            allocationDate: new Date(),
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session }
      )

      // 4. Actualizăm "Încasarea"
      compensationPayment.unallocatedAmount = absAmount
      await compensationPayment.save({ session })

      // 5. Închidem factura de discount
      invoice.paidAmount = invoice.paidAmount + invoice.remainingAmount
      invoice.remainingAmount = 0
      invoice.status = 'PAID'
      await invoice.save({ session })
    })

    await session.endSession()

    // --- RECALCULARE SOLD ---
    if (clientIdToRecalc) {
      try {
        await recalculateClientSummary(clientIdToRecalc, 'auto-recalc', true)
      } catch (err) {
        console.error('Eroare recalculare sold (compensation):', err)
      }
    }
    // ------------------------

    revalidatePath('/financial/invoices')
    revalidatePath('/admin/management/incasari-si-plati/receivables')
    revalidatePath('/clients')

    return {
      success: true,
      message:
        'Compensarea a fost creată. Puteți aloca suma din noua înregistrare.',
    }
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction()
    await session.endSession()
    console.error('Eroare createCompensation:', error)
    return { success: false, message: (error as Error).message }
  }
}
