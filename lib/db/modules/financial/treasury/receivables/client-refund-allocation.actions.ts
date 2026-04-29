'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import ClientPaymentModel from './client-payment.model'
import ClientRefundAllocationModel from './client-refund-allocation.model'
import { round2 } from '@/lib/utils'
import { connectToDatabase } from '@/lib/db'
import { recalculateClientSummary } from '../../../client/summary/client-summary.actions'
import { revalidatePath } from 'next/cache'
import {
  CreateClientRefundAllocationInput,
  CreateClientRefundAllocationSchema,
} from './client-refund-allocation.validator'

// 1. CREARE ALOCARE
export async function createClientRefundAllocation(
  data: CreateClientRefundAllocationInput,
) {
  await connectToDatabase()
  const session = await startSession()
  let clientIdToRecalc = ''

  try {
    const newAllocation = await session.withTransaction(async (session) => {
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateClientRefundAllocationSchema.parse(data)
      const {
        advancePaymentId,
        refundPaymentId,
        amountAllocated,
        allocationDate,
      } = validatedData

      const advancePayment =
        await ClientPaymentModel.findById(advancePaymentId).session(session)
      const refundPayment =
        await ClientPaymentModel.findById(refundPaymentId).session(session)

      if (!advancePayment || !refundPayment)
        throw new Error('Documentele originale nu au fost găsite.')
      if (!refundPayment.isRefund)
        throw new Error(
          'Documentul selectat pentru restituire nu este marcat ca atare.',
        )

      clientIdToRecalc = advancePayment.clientId.toString()

      const roundedAmount = round2(amountAllocated)

      // Validări de sume
      if (roundedAmount > round2(advancePayment.unallocatedAmount)) {
        throw new Error(
          `Suma depășește restul avansului (${advancePayment.unallocatedAmount}).`,
        )
      }
      if (roundedAmount > round2(Math.abs(refundPayment.unallocatedAmount))) {
        throw new Error(`Suma depășește valoarea restituirii.`)
      }

      // Creăm documentul
      const [createdAllocation] = await ClientRefundAllocationModel.create(
        [
          {
            advancePaymentId: advancePayment._id,
            refundPaymentId: refundPayment._id,
            amountAllocated: roundedAmount,
            allocationDate: allocationDate,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session },
      )

      // ACTUALIZĂM SUMELE
      advancePayment.unallocatedAmount = round2(
        advancePayment.unallocatedAmount - roundedAmount,
      )
      refundPayment.unallocatedAmount = round2(
        refundPayment.unallocatedAmount + roundedAmount,
      )

      await advancePayment.save({ session })
      await refundPayment.save({ session })

      return createdAllocation
    })

    await session.endSession()

    if (clientIdToRecalc) {
      try {
        await recalculateClientSummary(clientIdToRecalc, 'auto-recalc', true)
      } catch (err) {
        console.error('Eroare recalculare sold:', err)
      }
    }

    revalidatePath('/admin/management/incasari-si-plati/receivables')
    revalidatePath(`/clients/${clientIdToRecalc}`)

    return { success: true, message: 'Restituirea a fost stinsă cu succes!' }
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction()
    await session.endSession()
    console.error('❌ Eroare createClientRefundAllocation:', error)
    return { success: false, message: (error as Error).message }
  }
}

// 2. ADUCE AVANSURILE DISPONIBILE
export async function getUnallocatedAdvancesForClient(clientId: string) {
  try {
    await connectToDatabase()
    const advances = await ClientPaymentModel.find({
      clientId: new Types.ObjectId(clientId),
      isRefund: { $ne: true },
      status: { $in: ['NEALOCATA', 'PARTIAL_ALOCAT'] },
      unallocatedAmount: { $gt: 0 },
    })
      .sort({ paymentDate: 1 })
      .select(
        'paymentNumber seriesName paymentDate totalAmount unallocatedAmount paymentMethod',
      )
      .lean()

    return { success: true, data: JSON.parse(JSON.stringify(advances)) }
  } catch (error) {
    return { success: false, data: [] }
  }
}

// 3. ADUCE ALOCĂRILE DEJA FĂCUTE PE O ÎNCASARE
export async function getRefundAllocationsForClientPayment(paymentId: string) {
  try {
    await connectToDatabase()
    const allocations = await ClientRefundAllocationModel.find({
      $or: [
        { advancePaymentId: new Types.ObjectId(paymentId) },
        { refundPaymentId: new Types.ObjectId(paymentId) },
      ],
    })
      .populate({
        path: 'advancePaymentId refundPaymentId',
        model: ClientPaymentModel,
        select: 'paymentNumber seriesName paymentDate',
      })
      .sort({ createdAt: -1 })
      .lean()

    return { success: true, data: JSON.parse(JSON.stringify(allocations)) }
  } catch (error) {
    return { success: false, data: [] }
  }
}

// 4. ȘTERGE O ALOCARE (RESTOREAZĂ SUMELE)
export async function deleteClientRefundAllocation(allocationId: string) {
  await connectToDatabase()
  const session = await startSession()
  let clientIdToRecalc = ''

  try {
    await session.withTransaction(async (session) => {
      const allocation =
        await ClientRefundAllocationModel.findById(allocationId).session(
          session,
        )
      if (!allocation) throw new Error('Alocarea nu a fost găsită.')

      const advancePayment = await ClientPaymentModel.findById(
        allocation.advancePaymentId,
      ).session(session)
      const refundPayment = await ClientPaymentModel.findById(
        allocation.refundPaymentId,
      ).session(session)

      if (!advancePayment || !refundPayment)
        throw new Error('Documentele originale nu mai există.')

      clientIdToRecalc = advancePayment.clientId.toString()

      advancePayment.unallocatedAmount = round2(
        advancePayment.unallocatedAmount + allocation.amountAllocated,
      )
      refundPayment.unallocatedAmount = round2(
        refundPayment.unallocatedAmount - allocation.amountAllocated,
      )

      await advancePayment.save({ session })
      await refundPayment.save({ session })
      await ClientRefundAllocationModel.findByIdAndDelete(allocationId).session(
        session,
      )
    })

    await session.endSession()
    if (clientIdToRecalc)
      await recalculateClientSummary(clientIdToRecalc, 'auto-recalc', true)

    revalidatePath('/admin/management/incasari-si-plati/receivables')
    return { success: true, message: 'Alocarea a fost anulată cu succes.' }
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction()
    await session.endSession()
    return { success: false, message: (error as Error).message }
  }
}
