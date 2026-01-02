'use server'

import { connectToDatabase } from '@/lib/db'
import mongoose, { startSession, Types, FilterQuery } from 'mongoose'
import ReceiptModel, { IReceiptDoc } from './receipt.model'
import { CreateReceiptDTO, ReceiptDTO } from './receipt.types'
import { getSetting } from '../../setting/setting.actions'
import {
  generateNextDocumentNumber,
  getActiveSeriesForDocumentType,
} from '../../numbering/numbering.actions'
import { ISeries } from '../../numbering/series.model'
import { numberToWordsRo } from './receipt.utils'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { PAGE_SIZE } from '@/lib/constants'
import { recalculateClientSummary } from '../../client/summary/client-summary.actions'
import InvoiceModel from '../invoices/invoice.model'
import PaymentAllocationModel from '../treasury/receivables/payment-allocation.model'
import { round2 } from '@/lib/utils'
import ClientPaymentModel from '../treasury/receivables/client-payment.model'

// -------------------------------------------------------------
// CREATE RECEIPT
// -------------------------------------------------------------
export async function createReceiptAction(data: CreateReceiptDTO) {
  const userSession = await auth()

  if (!userSession?.user) {
    return { success: false, message: 'Nu ești autentificat.' }
  }

  try {
    await connectToDatabase()

    // 1. Validare Serie
    let activeSeries = data.seriesName
    if (!activeSeries) {
      const documentType = 'Chitanta' as unknown as any
      const seriesList = await getActiveSeriesForDocumentType(documentType)

      if (seriesList.length === 0)
        return { success: false, message: 'Nu există nicio serie activă.' }

      if (seriesList.length === 1) {
        activeSeries = seriesList[0].name
      } else {
        const seriesNames = seriesList.map((s: ISeries) => s.name)
        return {
          success: false,
          requireSelection: true,
          message: `Selectați o serie (${seriesNames.join(', ')}).`,
          series: seriesNames,
        }
      }
    }

    // 2. START TRANZACȚIE
    const dbSession = await startSession()
    let shouldRecalculate = false

    const createdReceipt = await dbSession.withTransaction(async (session) => {
      // A. Pregătire date
      const settings: any = await getSetting()
      if (!settings) throw new Error('Setările companiei lipsesc.')

      const nextNum = await generateNextDocumentNumber(activeSeries!, {
        session,
      })
      const paddedNum = String(nextNum).padStart(5, '0')
      const userId = new Types.ObjectId(userSession.user.id!)
      const userName = userSession.user.name!

      // B. Creăm ÎNCASAREA (ClientPayment)
      const [newPayment] = await ClientPaymentModel.create(
        [
          {
            paymentNumber: `${activeSeries}-${paddedNum}`,
            seriesName: activeSeries,
            clientId: new Types.ObjectId(data.clientId),
            paymentDate: new Date(),
            paymentMethod: 'CASH',
            totalAmount: data.amount,
            unallocatedAmount: data.amount,
            referenceDocument: `Chitanța ${activeSeries}-${paddedNum}`,
            notes: data.explanation,
            status: 'NEALOCATA',
            createdBy: userId,
            createdByName: userName,
          },
        ],
        { session }
      )

      // C. Procesăm ALOCĂRILE (Logic 100% din payment-allocation)
      const paidInvoiceIds: Types.ObjectId[] = []
      let totalAllocated = 0
      const allocations = data.allocations || []

      if (allocations.length > 0) {
        for (const alloc of allocations) {
          const amount = round2(alloc.amountToPay)
          if (amount <= 0) continue

          // Încărcăm factura cu SESIUNEA CURENTĂ
          const invoice = await InvoiceModel.findById(alloc.invoiceId).session(
            session
          )

          if (!invoice)
            throw new Error(
              `Factura ${alloc.invoiceSeries}-${alloc.invoiceNumber} nu există.`
            )
          if (invoice.status === 'PAID')
            throw new Error(
              `Factura ${invoice.invoiceNumber} este deja plătită.`
            )
          if (amount > round2(invoice.remainingAmount))
            throw new Error(
              `Suma depășește restul de plată la factura ${invoice.invoiceNumber}.`
            )

          // Creăm Alocarea
          await PaymentAllocationModel.create(
            [
              {
                paymentId: newPayment._id,
                invoiceId: invoice._id,
                amountAllocated: amount,
                allocationDate: new Date(),
                createdBy: userId,
                createdByName: userName,
              },
            ],
            { session }
          )

          // ACTUALIZĂM FACTURA
          // Important: Actualizăm doar sumele. Hook-ul "pre-save" din InvoiceModel
          // va detecta modificarea și va seta automat statusul PAID/PARTIAL
          invoice.paidAmount = round2(invoice.paidAmount + amount)
          invoice.remainingAmount = round2(invoice.remainingAmount - amount)

          await invoice.save({ session })

          paidInvoiceIds.push(invoice._id)
          totalAllocated += amount
        }
      }

      // D. Actualizăm ÎNCASAREA (dacă s-a alocat ceva)
      if (totalAllocated > 0) {
        newPayment.unallocatedAmount = round2(data.amount - totalAllocated)
        await newPayment.save({ session }) // Hook-ul va seta statusul platii
      }

      shouldRecalculate = true

      // E. Creăm CHITANȚA
      const [newReceipt] = await ReceiptModel.create(
        [
          {
            series: activeSeries,
            number: paddedNum,
            date: new Date(),
            companySnapshot: {
              name: settings.name,
              cui: settings.cui,
              regCom: settings.regCom,
              address: settings.address,
            },
            clientSnapshot: {
              name: data.clientName,
              cui: data.clientCui,
              address: data.clientAddress,
            },
            representative: data.representative,
            explanation: data.explanation,
            amount: data.amount,
            amountInWords: numberToWordsRo(data.amount),
            invoices: paidInvoiceIds,
            cashier: { userId, name: userName },
            status: 'VALID',
          },
        ],
        { session }
      )

      return JSON.parse(JSON.stringify(newReceipt)) as ReceiptDTO
    })

    await dbSession.endSession()

    // 3. Recalculare Sold (Post-Tranzacție)
    if (shouldRecalculate) {
      try {
        await recalculateClientSummary(data.clientId, 'receipt-create', true)
      } catch (e) {
        console.error(e)
      }
    }

    revalidatePath('/financial/receipts')
    revalidatePath('/financial/invoices')

    return {
      success: true,
      message: 'Chitanța a fost emisă cu succes.',
      data: createdReceipt,
    }
  } catch (error) {
    console.error('❌ Create Receipt Error:', error)
    return { success: false, message: (error as Error).message }
  }
}
// -------------------------------------------------------------
// CANCEL RECEIPT
// -------------------------------------------------------------
export async function cancelReceipt({
  receiptId,
  reason,
}: {
  receiptId: string
  reason: string
}) {
  const authSession = await auth()
  if (!authSession?.user?.id) return { success: false, message: 'Neautorizat.' }
  if (!reason || reason.length < 3)
    return { success: false, message: 'Motiv obligatoriu.' }

  try {
    await connectToDatabase()
    const receipt = await ReceiptModel.findById(receiptId)
    if (!receipt) return { success: false, message: 'Chitanța nu există.' }
    if (receipt.status === 'CANCELLED')
      return { success: false, message: 'Deja anulată.' }

    const dbSession = await startSession()
    let clientIdForRecalc: string | null = null

    await dbSession.withTransaction(async (session) => {
      // A. Găsim Plata asociată chitanței
      const referenceDoc = `Chitanța ${receipt.series}-${receipt.number}`
      const payment = await ClientPaymentModel.findOne({
        referenceDocument: referenceDoc,
      }).session(session)

      if (payment && payment.status !== 'ANULATA') {
        clientIdForRecalc = payment.clientId.toString()

        // B. Găsim și anulăm Alocările
        const allocations = await PaymentAllocationModel.find({
          paymentId: payment._id,
        }).session(session)

        for (const alloc of allocations) {
          const invoice = await InvoiceModel.findById(alloc.invoiceId).session(
            session
          )
          if (invoice) {
            // Inversăm sumele pe factură
            const amount = alloc.amountAllocated
            invoice.paidAmount = round2(invoice.paidAmount - amount)
            invoice.remainingAmount = round2(invoice.remainingAmount + amount)
            // Hook-ul InvoiceModel va reseta statusul automat la APPROVED/PARTIAL
            await invoice.save({ session })
          }
          // Ștergem alocarea
          await PaymentAllocationModel.findByIdAndDelete(alloc._id).session(
            session
          )
        }

        // C. Anulăm Plata
        payment.status = 'ANULATA'
        payment.unallocatedAmount = payment.totalAmount
        await payment.save({ session })
      }

      // D. Anulăm Chitanța
      receipt.status = 'CANCELLED'
      receipt.cancellationReason = reason
      receipt.cancelledBy = new Types.ObjectId(authSession.user!.id)
      receipt.cancelledByName = authSession.user!.name || 'Utilizator'

      await receipt.save({ session })
    })

    await dbSession.endSession()

    if (clientIdForRecalc) {
      try {
        await recalculateClientSummary(
          clientIdForRecalc!,
          'receipt-cancel',
          true
        )
      } catch (e) {
        console.error(e)
      }
    }

    revalidatePath('/financial/receipts')
    revalidatePath('/financial/invoices')

    return { success: true, message: 'Chitanța a fost anulată.' }
  } catch (error) {
    console.error('Cancel Receipt Error:', error)
    return { success: false, message: 'Eroare la anulare.' }
  }
}
// -------------------------------------------------------------
// GET RECEIPTS (List + Search)
// -------------------------------------------------------------
export async function getReceipts(
  page: number = 1,
  limit: number = PAGE_SIZE,
  filters?: {
    search?: string
    startDate?: string
    endDate?: string
  }
): Promise<{ data: ReceiptDTO[]; totalPages: number }> {
  try {
    await connectToDatabase()
    const skip = (page - 1) * limit
    const query: FilterQuery<IReceiptDoc> = {}

    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, 'i')
      query.$or = [
        { 'clientSnapshot.name': searchRegex },
        { series: searchRegex },
        { number: searchRegex },
        { representative: searchRegex },
      ]
    }

    if (filters?.startDate || filters?.endDate) {
      query.date = {}
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        query.date.$lte = end
      }
    }

    const [total, docs] = await Promise.all([
      ReceiptModel.countDocuments(query),
      ReceiptModel.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ])

    return {
      data: JSON.parse(JSON.stringify(docs)) as ReceiptDTO[],
      totalPages: Math.ceil(total / limit),
    }
  } catch (e) {
    console.error('❌ Error getReceipts:', e)
    return { data: [], totalPages: 0 }
  }
}

// -------------------------------------------------------------
// GET BY ID
// -------------------------------------------------------------
export async function getReceiptById(
  id: string
): Promise<{ success: boolean; data?: ReceiptDTO; message?: string }> {
  try {
    await connectToDatabase()
    const doc = await ReceiptModel.findById(id).lean()

    if (!doc) {
      return { success: false, message: 'Chitanța nu a fost găsită.' }
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(doc)) as ReceiptDTO,
    }
  } catch (error) {
    console.error('❌ Error getReceiptById:', error)
    return { success: false, message: 'Eroare la preluarea chitanței.' }
  }
}

export async function getReceiptSeriesList() {
  try {
    await connectToDatabase()
    // Căutăm seriile active pentru Chitanțe
    const documentType = 'Chitanta' as unknown as any
    const seriesList = await getActiveSeriesForDocumentType(documentType)

    // Returnăm doar numele lor
    return { success: true, data: seriesList.map((s: any) => s.name) }
  } catch (error) {
    return { success: false, data: [] }
  }
}

// --- FUNCȚIE SPECIALĂ PENTRU CHITANȚE (NU AFECTEAZĂ TREASURY) ---
export async function getPayableInvoicesForReceipt(clientId: string) {
  try {
    await connectToDatabase()

    if (!Types.ObjectId.isValid(clientId)) {
      return { success: false, message: 'ID Client invalid' }
    }

    const invoices = await InvoiceModel.find({
      clientId: new Types.ObjectId(clientId),
      // 1. EXCLUDEM PROFORMELE
      invoiceType: { $in: ['STANDARD', 'AVANS'] },
      // 1. Luăm și APPROVED și PARTIAL_PAID (ca să apară cele din poze)
      status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
      // 2. Doar cele cu rest de plată POZITIV (fără storno)
      remainingAmount: { $gt: 0.01 },
    })
      .sort({ dueDate: 1 }) // Cele mai vechi primele
      .select(
        'invoiceNumber seriesName dueDate remainingAmount totals.grandTotal status'
      )
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(invoices)),
    }
  } catch (error) {
    console.error('Error fetching payable invoices:', error)
    return { success: false, data: [] }
  }
}
