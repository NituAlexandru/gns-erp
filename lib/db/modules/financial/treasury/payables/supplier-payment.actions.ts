'use server'

import mongoose, { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import SupplierInvoiceModel from './supplier-invoice.model'
import SupplierPaymentModel from './supplier-payment.model'
import SupplierAllocationModel from './supplier-allocation.model'
import { round2, formatCurrency } from '@/lib/utils'
import {
  SupplierPaymentDTO,
  ISupplierPaymentDoc,
} from './supplier-payment.types'
import {
  SupplierPaymentPayloadSchema,
  CreateSupplierPaymentFormSchema,
  BudgetCategorySnapshotSchema,
} from './supplier-payment.validator'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/db'
import Supplier from '../../../suppliers/supplier.model'
import BudgetCategoryModel from '../budgeting/budget-category.model'
import { PopulatedSupplierPayment } from '@/app/admin/management/incasari-si-plati/payables/components/SupplierAllocationModal'
import { SupplierPaymentStatus } from './supplier-payment.constants'
import { CLIENT_DETAIL_PAGE_SIZE } from '@/lib/constants'
import { recalculateSupplierSummary } from '../../../suppliers/summary/supplier-summary.actions'

type AllocationDetail = { invoiceNumber: string; allocatedAmount: number }

type PaymentActionResult = {
  success: boolean
  message: string
  data?: SupplierPaymentDTO
  allocationDetails?: AllocationDetail[]
}
type PaymentCancellationResult = {
  success: boolean
  message: string
}

type CheckResult = {
  success: boolean
  hasUnallocatedPayment: boolean
  payment?: PopulatedSupplierPayment | null
  message?: string
}
export interface SupplierPaymentListItem {
  _id: string
  paymentDate: Date
  paymentMethod: string
  paymentNumber?: string
  seriesName?: string
  totalAmount: number
  status: SupplierPaymentStatus
}

export type SupplierPaymentsPage = {
  data: SupplierPaymentListItem[]
  totalPages: number
  total: number
}
export async function createSupplierPayment(
  data: z.infer<typeof CreateSupplierPaymentFormSchema>
): Promise<PaymentActionResult> {
  const session = await startSession()
  let newPaymentDoc: ISupplierPaymentDoc | null = null
  const allocationDetails: AllocationDetail[] = []

  try {
    newPaymentDoc = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateSupplierPaymentFormSchema.parse(data)
      const totalAmount = Number(validatedData.totalAmount)

      // --- Construim Snapshot-ul de Buget (cu string-uri) ---
      let budgetSnapshotForValidation: z.infer<
        typeof BudgetCategorySnapshotSchema
      > = undefined

      if (validatedData.mainCategoryId) {
        const mainCategory = await BudgetCategoryModel.findById(
          validatedData.mainCategoryId
        ).lean()
        if (!mainCategory)
          throw new Error('Categoria de buget nu a fost găsită.')

        let subCategoryName: string | undefined = undefined
        if (validatedData.subCategoryId) {
          const subCategory = await BudgetCategoryModel.findById(
            validatedData.subCategoryId
          ).lean()
          if (!subCategory)
            throw new Error('Subcategoria de buget nu a fost găsită.')
          subCategoryName = subCategory.name
        }

        budgetSnapshotForValidation = {
          mainCategoryId: mainCategory._id.toString(),
          mainCategoryName: mainCategory.name,
          subCategoryId: validatedData.subCategoryId
            ? validatedData.subCategoryId.toString()
            : undefined,
          subCategoryName: subCategoryName,
        }
      }

      // 3. Construim payload-ul (conform schemei Zod)
      const payload: z.infer<typeof SupplierPaymentPayloadSchema> = {
        ...validatedData,
        totalAmount: totalAmount,
        unallocatedAmount: totalAmount,

        referenceDocument: validatedData.referenceDocument,
        seriesName: validatedData.seriesName,
        budgetCategorySnapshot: budgetSnapshotForValidation,
      }

      const payloadValidation = SupplierPaymentPayloadSchema.safeParse(payload)
      if (!payloadValidation.success) {
        throw new Error(
          'Eroare de validare payload: ' + payloadValidation.error.message
        )
      }

      // 4. Crearea Plății
      const [newPayment] = await SupplierPaymentModel.create(
        [
          {
            ...payloadValidation.data,
            paymentNumber: payloadValidation.data.referenceDocument || null,
            sequenceNumber: null,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session }
      )

      // ... (Logica de alocare ) ...
      let currentUnallocated = newPayment.totalAmount
      if (currentUnallocated <= 0) {
        return newPayment
      }
      const invoicesToPay = await SupplierInvoiceModel.find({
        supplierId: validatedData.supplierId,
        status: { $in: ['NEPLATITA', 'PARTIAL_PLATITA'] },
        remainingAmount: { $gt: 0 },
      })
        .sort({ dueDate: 1 })
        .session(session)
      for (const invoice of invoicesToPay) {
        if (currentUnallocated <= 0) break
        const remainingOnInvoice = invoice.remainingAmount
        let amountToAllocate = 0
        if (currentUnallocated >= remainingOnInvoice) {
          amountToAllocate = remainingOnInvoice
        } else {
          amountToAllocate = currentUnallocated
        }
        amountToAllocate = round2(amountToAllocate)
        if (amountToAllocate <= 0) continue
        allocationDetails.push({
          invoiceNumber: `${invoice.invoiceSeries || ''}-${invoice.invoiceNumber || ''}`,
          allocatedAmount: amountToAllocate,
        })
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
        invoice.paidAmount = round2(invoice.paidAmount + amountToAllocate)
        invoice.remainingAmount = round2(
          invoice.remainingAmount - amountToAllocate
        )
        if (invoice.remainingAmount <= 0.001) {
          invoice.status = 'PLATITA'
          invoice.remainingAmount = 0
        } else {
          invoice.status = 'PARTIAL_PLATITA'
        }
        await invoice.save({ session })
        currentUnallocated = round2(currentUnallocated - amountToAllocate)
      }
      newPayment.unallocatedAmount = currentUnallocated
      return await newPayment.save({ session })
    })

    await session.endSession()

    if (newPaymentDoc) {
      try {
        await recalculateSupplierSummary(
          newPaymentDoc.supplierId.toString(),
          'auto-recalc',
          true
        )
      } catch (err) {
        console.error('Eroare recalculare sold furnizor (create payment):', err)
      }
    }

    if (!newPaymentDoc) {
      throw new Error('Tranzacția nu a returnat un document de plată.')
    }
    revalidatePath('/admin/management/incasari-si-plati/payables')
    revalidatePath(`/suppliers/${newPaymentDoc.supplierId.toString()}`)

    return {
      success: true,
      message: `Plata de ${formatCurrency(newPaymentDoc.totalAmount)} a fost salvată.`,
      data: JSON.parse(JSON.stringify(newPaymentDoc)),
      allocationDetails: allocationDetails,
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

// ... (getSupplierPayments rămâne la fel) ...
export async function getSupplierPayments() {
  try {
    await connectToDatabase()
    const payments = await SupplierPaymentModel.find()
      .populate({
        path: 'supplierId',
        model: Supplier,
        select: 'name',
      })
      .sort({ paymentDate: -1 })
      .lean()
    return {
      success: true,
      data: JSON.parse(JSON.stringify(payments)),
    }
  } catch (error) {
    console.error('❌ Eroare getSupplierPayments:', error)
    return { success: false, data: [] }
  }
}

export async function getSupplierPaymentById(paymentId: string) {
  try {
    await connectToDatabase()

    const payment = await SupplierPaymentModel.findById(paymentId)
      .populate({
        path: 'supplierId',
        model: Supplier,
        select: 'name',
      })
      .lean()

    if (!payment) throw new Error('Plata nu a fost găsită.')

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payment)),
    }
  } catch (error) {
    console.error('❌ Eroare getSupplierPaymentById:', error)
    return { success: false, data: null, message: (error as Error).message }
  }
}
/**
 * Anulează o plată furnizor. Permis doar dacă plata este NEALOCATA.
 */
export async function cancelSupplierPayment(
  paymentId: string
): Promise<PaymentCancellationResult> {
  const session = await startSession()

  let supplierIdToRecalc = ''

  try {
    await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')
      if (!Types.ObjectId.isValid(paymentId))
        throw new Error('ID Plată invalid.')

      // 2. Găsește Plata
      const payment =
        await SupplierPaymentModel.findById(paymentId).session(session)
      if (!payment) throw new Error('Plata nu a fost găsită.')

      supplierIdToRecalc = payment.supplierId.toString()

      // 3. Verificări de Business
      if (payment.status === 'ANULATA') {
        throw new Error('Plata este deja anulată.')
      }
      // Nu permitem anularea directă dacă are alocări (chiar și parțiale)
      if (
        payment.status === 'PARTIAL_ALOCATA' ||
        payment.status === 'ALOCATA'
      ) {
        throw new Error(
          'Plata are alocări active și nu poate fi anulată direct. Vă rugăm anulați alocările existente manual.'
        )
      }

      // Verificare explicită (deși hook-ul 'pre-save' de pe payment ar trebui să asigure NEALOCATA)
      const allocationCount = await SupplierAllocationModel.countDocuments({
        paymentId: new Types.ObjectId(paymentId),
      }).session(session)

      if (allocationCount > 0) {
        throw new Error('Plata are înregistrări de alocări în baza de date.')
      }

      // 4. Actualizează Statusul
      payment.status = 'ANULATA'

      await payment.save({ session })
    })

    await session.endSession()

    if (supplierIdToRecalc) {
      try {
        await recalculateSupplierSummary(
          supplierIdToRecalc,
          'auto-recalc',
          true
        )
      } catch (err) {
        console.error(err)
      }
    }

    revalidatePath('/admin/management/incasari-si-plati/payables')
    revalidatePath(`/suppliers/${paymentId}`)

    return { success: true, message: 'Plata a fost anulată cu succes.' }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare cancelSupplierPayment:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function checkSupplierHasUnallocatedPayments(
  supplierId: string
): Promise<CheckResult> {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(supplierId)) {
      return { success: false, hasUnallocatedPayment: false }
    }

    // Căutăm o plată care NU e ALOCATA/ANULATA și care are unallocatedAmount > 0
    const payment = await SupplierPaymentModel.findOne({
      supplierId: new Types.ObjectId(supplierId),
      status: { $in: ['NEALOCATA', 'PARTIAL_ALOCATA'] },
      unallocatedAmount: { $gt: 0 },
    })
      .populate({
        path: 'supplierId',
        select: 'name',
      })
      .lean()

    return {
      success: true,
      hasUnallocatedPayment: !!payment,
      payment: payment
        ? (JSON.parse(JSON.stringify(payment)) as PopulatedSupplierPayment)
        : null,
    }
  } catch (error) {
    console.error('❌ Eroare checkSupplierHasUnallocatedPayments:', error)
    return { success: false, hasUnallocatedPayment: false, payment: null }
  }
}
export async function getPaymentsForSupplier(
  supplierId: string,
  page: number = 1
): Promise<SupplierPaymentsPage> {
  try {
    await connectToDatabase()

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      throw new Error('ID Furnizor invalid')
    }

    const objectId = new Types.ObjectId(supplierId)
    const limit = CLIENT_DETAIL_PAGE_SIZE
    const skip = (page - 1) * limit

    const queryConditions = {
      supplierId: objectId,
    }

    const total = await SupplierPaymentModel.countDocuments(queryConditions)

    if (total === 0) {
      return { data: [], totalPages: 0, total: 0 }
    }

    const payments = await SupplierPaymentModel.find(queryConditions)
      .select(
        'paymentDate paymentMethod paymentNumber seriesName totalAmount status'
      )
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const normalizedPayments = payments.map((p) => ({
      ...p,
      _id: p._id.toString(),
    })) as unknown as SupplierPaymentListItem[]

    return {
      data: normalizedPayments,
      totalPages: Math.ceil(total / limit),
      total: total,
    }
  } catch (error) {
    console.error('Eroare la getPaymentsForSupplier:', error)
    return { data: [], totalPages: 0, total: 0 }
  }
}
