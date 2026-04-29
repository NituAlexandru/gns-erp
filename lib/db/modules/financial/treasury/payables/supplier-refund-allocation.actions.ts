'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import SupplierPaymentModel from './supplier-payment.model'
import SupplierRefundAllocationModel from './supplier-refund-allocation.model'
import { round2 } from '@/lib/utils'
import { connectToDatabase } from '@/lib/db'
import { recalculateSupplierSummary } from '../../../suppliers/summary/supplier-summary.actions'
import { revalidatePath } from 'next/cache'
import {
  CreateSupplierRefundAllocationInput,
  CreateSupplierRefundAllocationSchema,
} from './supplier-refund-allocation.validator'

export async function createSupplierRefundAllocation(
  data: CreateSupplierRefundAllocationInput,
) {
  await connectToDatabase()
  const session = await startSession()

  let supplierIdToRecalc = ''

  try {
    const newAllocation = await session.withTransaction(async (session) => {
      // 1. Validare și Auth
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateSupplierRefundAllocationSchema.parse(data)
      const {
        advancePaymentId,
        refundPaymentId,
        amountAllocated,
        allocationDate,
      } = validatedData

      // 2. Găsim ambele plăți
      const advancePayment =
        await SupplierPaymentModel.findById(advancePaymentId).session(session)
      const refundPayment =
        await SupplierPaymentModel.findById(refundPaymentId).session(session)

      if (!advancePayment) throw new Error('OP-ul de avans nu a fost găsit.')
      if (!refundPayment)
        throw new Error('OP-ul de restituire nu a fost găsit.')
      if (!refundPayment.isRefund)
        throw new Error(
          'Documentul selectat pentru restituire nu este marcat ca atare.',
        )

      supplierIdToRecalc = advancePayment.supplierId.toString()

      // 3. Validări de sume
      const roundedAmount = round2(amountAllocated)

      // Verificăm să nu alocăm mai mult decât a rămas din avans
      if (roundedAmount > round2(advancePayment.unallocatedAmount)) {
        throw new Error(
          `Suma de alocat (${roundedAmount}) depășește restul avansului (${advancePayment.unallocatedAmount}).`,
        )
      }

      // Verificăm să nu alocăm mai mult decât trebuie restituit (folosim Math.abs pentru că refund-ul e negativ)
      if (roundedAmount > round2(Math.abs(refundPayment.unallocatedAmount))) {
        throw new Error(
          `Suma de alocat (${roundedAmount}) depășește valoarea restituirii.`,
        )
      }

      // 4. Creăm documentul de legătură
      const [createdAllocation] = await SupplierRefundAllocationModel.create(
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

      // 5. ACTUALIZĂM MATEMATIC PLĂȚILE

      // Din avans SCĂDEM suma (ex: 1000 - 900 = 100)
      advancePayment.unallocatedAmount = round2(
        advancePayment.unallocatedAmount - roundedAmount,
      )

      // La restituire ADUNĂM suma (ex: -900 + 900 = 0)
      refundPayment.unallocatedAmount = round2(
        refundPayment.unallocatedAmount + roundedAmount,
      )

      // Salvăm ambele documente (Aici intervine Hook-ul tău modificat care rezolvă automat Statusul)
      await advancePayment.save({ session })
      await refundPayment.save({ session })

      return createdAllocation
    })

    await session.endSession()

    // 6. Recalculăm soldul general al furnizorului
    if (supplierIdToRecalc) {
      try {
        await recalculateSupplierSummary(
          supplierIdToRecalc,
          'auto-recalc',
          true,
        )
      } catch (err) {
        console.error('Eroare la recalculare sold furnizor:', err)
      }
    }

    // Revalidăm UI-ul
    revalidatePath('/admin/management/incasari-si-plati/payables')
    revalidatePath(`/suppliers/${supplierIdToRecalc}`)

    return {
      success: true,
      message: 'Restituirea a fost alocată cu succes!',
      data: JSON.parse(JSON.stringify(newAllocation)),
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare createSupplierRefundAllocation:', error)
    return { success: false, message: (error as Error).message }
  }
}

export async function getUnallocatedAdvancesForSupplier(supplierId: string) {
  try {
    await connectToDatabase()

    // Căutăm plăți pozitive (isRefund: false sau inexistent), nealocate complet
    const advances = await SupplierPaymentModel.find({
      supplierId: new Types.ObjectId(supplierId),
      isRefund: { $ne: true },
      status: { $in: ['NEALOCATA', 'PARTIAL_ALOCATA'] },
      unallocatedAmount: { $gt: 0 },
    })
      .sort({ paymentDate: 1 })
      .select(
        'paymentNumber seriesName paymentDate totalAmount unallocatedAmount paymentMethod',
      )
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(advances)),
    }
  } catch (error) {
    console.error('❌ Eroare getUnallocatedAdvancesForSupplier:', error)
    return { success: false, data: [] }
  }
}

export async function getRefundAllocationsForPayment(paymentId: string) {
  try {
    await connectToDatabase()

    const allocations = await SupplierRefundAllocationModel.find({
      $or: [
        { advancePaymentId: new Types.ObjectId(paymentId) },
        { refundPaymentId: new Types.ObjectId(paymentId) },
      ],
    })
      .populate({
        path: 'advancePaymentId refundPaymentId',
        model: SupplierPaymentModel,
        select: 'paymentNumber seriesName paymentDate',
      })
      .sort({ createdAt: -1 })
      .lean()

    return { success: true, data: JSON.parse(JSON.stringify(allocations)) }
  } catch (error) {
    console.error('❌ Eroare getRefundAllocationsForPayment:', error)
    return { success: false, data: [] }
  }
}

/**
 * Șterge o alocare refund-avans și restorează sumele
 */
export async function deleteSupplierRefundAllocation(allocationId: string) {
  await connectToDatabase()
  const session = await startSession()
  let supplierIdToRecalc = ''

  try {
    await session.withTransaction(async (session) => {
      const allocation =
        await SupplierRefundAllocationModel.findById(allocationId).session(
          session,
        )
      if (!allocation) throw new Error('Alocarea nu a fost găsită.')

      const advancePayment = await SupplierPaymentModel.findById(
        allocation.advancePaymentId,
      ).session(session)
      const refundPayment = await SupplierPaymentModel.findById(
        allocation.refundPaymentId,
      ).session(session)

      if (!advancePayment || !refundPayment)
        throw new Error('Documentele originale nu mai există.')

      supplierIdToRecalc = advancePayment.supplierId.toString()

      // Inversăm matematica:
      // La avans punem banii înapoi (unallocated crește)
      advancePayment.unallocatedAmount = round2(
        advancePayment.unallocatedAmount + allocation.amountAllocated,
      )
      // La refund scădem suma restituită (unallocated scade înapoi spre minus)
      refundPayment.unallocatedAmount = round2(
        refundPayment.unallocatedAmount - allocation.amountAllocated,
      )

      await advancePayment.save({ session })
      await refundPayment.save({ session })
      await SupplierRefundAllocationModel.findByIdAndDelete(
        allocationId,
      ).session(session)
    })

    await session.endSession()
    if (supplierIdToRecalc)
      await recalculateSupplierSummary(supplierIdToRecalc, 'auto-recalc', true)

    revalidatePath('/admin/management/incasari-si-plati/payables')
    return { success: true, message: 'Alocarea a fost anulată cu succes.' }
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction()
    await session.endSession()
    return { success: false, message: (error as Error).message }
  }
}
