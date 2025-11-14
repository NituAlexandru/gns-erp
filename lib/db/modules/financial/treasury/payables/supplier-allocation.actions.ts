'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import SupplierInvoiceModel from './supplier-invoice.model'
import SupplierPaymentModel from './supplier-payment.model'
import SupplierAllocationModel from './supplier-allocation.model'
import { round2 } from '@/lib/utils'
import {
  CreateSupplierAllocationInput,
  SupplierAllocationDTO,
  ISupplierAllocationDoc,
} from './supplier-allocation.types'
import { CreateSupplierAllocationSchema } from './supplier-allocation.validator'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/db'

type AllocationActionResult = {
  success: boolean
  message: string
  data?: SupplierAllocationDTO
}
export type PopulatedInvoiceAllocationHistory = Awaited<
  ReturnType<typeof getInvoiceAllocationHistory>
>['data'][number]


export async function createManualSupplierAllocation(
  data: CreateSupplierAllocationInput
): Promise<AllocationActionResult> {
  const session = await startSession()
  let newAllocation: ISupplierAllocationDoc | null = null
  let supplierIdToRevalidate: string | null = null

  try {
    newAllocation = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateSupplierAllocationSchema.parse(data)
      const { paymentId, invoiceId, amountAllocated, allocationDate } =
        validatedData

      // 2. Găsire documente
      const payment =
        await SupplierPaymentModel.findById(paymentId).session(session)
      const invoice =
        await SupplierInvoiceModel.findById(invoiceId).session(session)

      // 3. Validări de Business
      if (!payment) throw new Error('Plata sursă nu a fost găsită.')
      if (!invoice) throw new Error('Factura furnizor țintă nu a fost găsită.')

      supplierIdToRevalidate = payment.supplierId.toString()

      // --- MODIFICARE: Folosim statusul corect ---
      if (invoice.status === 'PLATITA')
        throw new Error('Factura furnizor este deja marcată ca "Plătită".')

      if (invoice.status === 'ANULATA')
        throw new Error('Factura furnizor este marcată ca "Anulată".')

      const roundedAmount = round2(amountAllocated)
      if (roundedAmount > round2(payment.unallocatedAmount)) {
        throw new Error(
          `Suma de alocat (${roundedAmount}) este mai mare decât suma nealocată din plată (${payment.unallocatedAmount}).`
        )
      }
      if (roundedAmount > round2(invoice.remainingAmount)) {
        throw new Error(
          `Suma de alocat (${roundedAmount}) este mai mare decât restul de plată al facturii furnizor (${invoice.remainingAmount}).`
        )
      }

      // 4. Crearea Alocării (Model 5)
      const [createdAllocation] = await SupplierAllocationModel.create(
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

      // 5. Actualizare Plată (Model 4)
      payment.unallocatedAmount = round2(
        payment.unallocatedAmount - roundedAmount
      )
      await payment.save({ session })

      // 6. Actualizare Factură Furnizor (Model 3)
      invoice.paidAmount = round2(invoice.paidAmount + roundedAmount)
      invoice.remainingAmount = round2(invoice.remainingAmount - roundedAmount)

      // --- MODIFICARE: Folosim statusurile corecte ---
      if (invoice.remainingAmount <= 0.001) {
        invoice.status = 'PLATITA' 
        invoice.remainingAmount = 0
      } else {
        invoice.status = 'PARTIAL_PLATITA'
      }
      await invoice.save({ session })

      return createdAllocation
    })

    await session.endSession()

    if (!newAllocation) {
      throw new Error('Tranzacția nu a returnat o alocare.')
    }
    revalidatePath(`/financial/invoices/${newAllocation.invoiceId.toString()}`)
    revalidatePath('/incasari-si-plati/payables')
    if (supplierIdToRevalidate) {
      revalidatePath(`/suppliers/${supplierIdToRevalidate}`)
    }

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
    console.error('❌ Eroare createManualSupplierAllocation:', error)
    return { success: false, message: (error as Error).message }
  }
}

/**
 * Șterge o alocare a unei plăți către furnizor.
 */
export async function deleteSupplierAllocation(
  allocationId: string
): Promise<Omit<AllocationActionResult, 'data'>> {
  const session = await startSession()
  let supplierIdToRevalidate: string | null = null

  try {
    await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')

      if (!Types.ObjectId.isValid(allocationId))
        throw new Error('ID Alocare invalid.')

      // 2. Găsește Alocarea
      const allocation =
        await SupplierAllocationModel.findById(allocationId).session(session)
      if (!allocation) throw new Error('Alocarea nu a fost găsită.')

      const amountToReverse = allocation.amountAllocated

      // 3. Găsește documentele părinte
      const payment = await SupplierPaymentModel.findById(
        allocation.paymentId
      ).session(session)
      const invoice = await SupplierInvoiceModel.findById(
        allocation.invoiceId
      ).session(session)

      if (!payment || !invoice) {
        throw new Error(
          'Date corupte. Factura sau Plata aferentă nu au fost găsite.'
        )
      }

      supplierIdToRevalidate = payment.supplierId.toString()

      if (invoice.status === 'ANULATA') {
        throw new Error('Nu se poate anula o alocare de pe o factură anulată.')
      }

      // 4. Reversează actualizarea pe Plată (Model 4)
      payment.unallocatedAmount = round2(
        payment.unallocatedAmount + amountToReverse
      )
      await payment.save({ session })

      // 5. Reversează actualizarea pe Factură Furnizor (Model 3)
      invoice.paidAmount = round2(invoice.paidAmount - amountToReverse)
      invoice.remainingAmount = round2(
        invoice.remainingAmount + amountToReverse
      )

      // --- MODIFICARE: Folosim statusurile corecte la reversare ---
      if (invoice.status === 'PLATITA') {
        invoice.status =
          invoice.paidAmount > 0 ? 'PARTIAL_PLATITA' : 'NEPLATITA'
      } else if (invoice.status === 'PARTIAL_PLATITA') {
        if (invoice.paidAmount <= 0) {
          invoice.status = 'NEPLATITA'
        }
      }

      await invoice.save({ session })

      // 6. Șterge Alocarea (Model 5)
      await SupplierAllocationModel.findByIdAndDelete(allocationId).session(
        session
      )
    })

    await session.endSession()

    revalidatePath('/incasari-si-plati/payables')
    if (supplierIdToRevalidate) {
      revalidatePath(`/suppliers/${supplierIdToRevalidate}`)
    } else {
      revalidatePath('/suppliers')
    }

    return {
      success: true,
      message: 'Alocarea a fost ștearsă cu succes.',
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare deleteSupplierAllocation:', error)
    return { success: false, message: (error as Error).message }
  }
}

// --- FUNCȚIA 1: PENTRU A VEDEA CE E DEJA ALOCAT (PLĂȚII) ---
export async function getAllocationsForSupplierPayment(paymentId: string) {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new Error('ID Plată furnizor invalid.')
    }

    const allocations = await SupplierAllocationModel.find({
      paymentId: new Types.ObjectId(paymentId),
    })
      .populate({
        path: 'invoiceId',
        model: SupplierInvoiceModel,
        select: 'invoiceNumber invoiceSeries', 
      })
      .sort({ createdAt: -1 })
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allocations)),
    }
  } catch (error) {
    console.error('❌ Eroare getAllocationsForSupplierPayment:', error)
    return { success: false, data: [] }
  }
}

// --- FUNCȚIA 2: PENTRU A VEDEA CE FACTURI FURNIZOR SE POT PLĂTI ---
export async function getUnpaidSupplierInvoices(supplierId: string) {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(supplierId)) {
      throw new Error('ID Furnizor invalid.')
    }

    const invoices = await SupplierInvoiceModel.find({
      supplierId: new Types.ObjectId(supplierId),
      status: { $in: ['NEPLATITA', 'PARTIAL_PLATITA'] },
      remainingAmount: { $gt: 0 },
    })
      .sort({ dueDate: 1 }) // Ordonăm FIFO
      .select(
        'invoiceNumber invoiceSeries dueDate remainingAmount totals.grandTotal'
      )
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(invoices)),
    }
  } catch (error) {
    console.error('❌ Eroare getUnpaidSupplierInvoices:', error)
    return { success: false, data: [] }
  }
}

/**
 * Prelucrează și returnează istoricul alocărilor (plăților) pentru o anumită factură.
 */
export async function getInvoiceAllocationHistory(invoiceId: string) {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new Error('ID Factură invalid.')
    }

    const allocations = await SupplierAllocationModel.find({
      invoiceId: new Types.ObjectId(invoiceId),
    })
      .populate({
        path: 'paymentId',
        model: SupplierPaymentModel,
        select: 'paymentNumber seriesName paymentDate', 
      })
      .sort({ allocationDate: 1 }) 
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(allocations)),
    }
  } catch (error) {
    console.error('❌ Eroare getInvoiceAllocationHistory:', error)
    return { success: false, data: [], message: (error as Error).message }
  }
}
