'use server'

import { PipelineStage, startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import InvoiceModel from '../../../financial/invoices/invoice.model'
import ClientPaymentModel from './client-payment.model'
import PaymentAllocationModel from './payment-allocation.model'
import { formatCurrency, round2 } from '@/lib/utils'
import {
  CreateClientPaymentInput,
  ClientPaymentDTO,
  IClientPaymentDoc,
} from './client-payment.types'
import { CreateClientPaymentSchema } from './client-payment.validator'
import { revalidatePath } from 'next/cache'
import { connectToDatabase } from '@/lib/db'
import ClientModel from '../../../client/client.model'
import { recalculateClientSummary } from '../../../client/summary/client-summary.actions'
import { RECEIVABLES_PAGE_SIZE } from '@/lib/constants'
import {
  getNextReceiptNumberPreview,
  incrementReceiptNumber,
} from '../../../numbering/receipt-numbering.actions'
import { getInvoiceById } from '../../invoices/invoice.actions'

type PopulatedClientPayment = ClientPaymentDTO & {
  clientId: {
    _id: string
    name: string
  }
}

// Tipul de răspuns pentru getById
type GetPaymentResult = {
  success: boolean
  data: PopulatedClientPayment | null
  message?: string
}

type AllocationDetail = { invoiceNumber: string; allocatedAmount: number }

type PaymentActionResult = {
  success: boolean
  message: string
  data?: ClientPaymentDTO
  allocationDetails?: AllocationDetail[]
}
export async function createClientPayment(
  data: CreateClientPaymentInput,
): Promise<PaymentActionResult> {
  await connectToDatabase()
  const session = await startSession()
  let newPaymentDoc: IClientPaymentDoc | null = null
  const allocationDetails: AllocationDetail[] = []

  try {
    newPaymentDoc = await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      const validatedData = CreateClientPaymentSchema.parse(data)

      // --- LOGICĂ NUMEROTARE AUTOMATĂ ---
      const expectedAutoNumber = await getNextReceiptNumberPreview()

      // Dacă userul a păstrat numărul propus, incrementăm contorul
      if (validatedData.paymentNumber === expectedAutoNumber) {
        await incrementReceiptNumber()
      }

      // 3. Crearea Încasării
      const [newPayment] = await ClientPaymentModel.create(
        [
          {
            ...validatedData,
            paymentNumber: validatedData.paymentNumber,
            referenceDocument: validatedData.referenceDocument,
            seriesName: validatedData.seriesName,
            sequenceNumber: null,
            unallocatedAmount: validatedData.totalAmount,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session },
      )

      let currentUnallocated = newPayment.totalAmount
      if (currentUnallocated <= 0) {
        return newPayment
      }

      // 4. LOGICA DE ALOCARE (HIBRIDĂ: SELECTATE -> FIFO)

      // A. Luăm facturile eligibile
      const invoicesToPay = await InvoiceModel.find({
        clientId: validatedData.clientId,
        status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
        remainingAmount: { $gt: 0 },
        seriesName: { $ne: 'INIT-AMB' },
        invoiceType: { $ne: 'PROFORMA' },
      })
        .sort({ dueDate: 1, _id: 1 })
        .session(session)

      // B. RE-SORTARE INTELIGENTĂ
      const selectedIds = validatedData.selectedInvoiceIds || []

      if (selectedIds.length > 0) {
        invoicesToPay.sort((a, b) => {
          const isASelected = selectedIds.includes(a._id.toString())
          const isBSelected = selectedIds.includes(b._id.toString())

          if (isASelected && !isBSelected) return -1
          if (!isASelected && isBSelected) return 1
          return 0
        })
      }

      // C. DISTRIBUIREA BANILOR
      for (const invoice of invoicesToPay) {
        if (currentUnallocated <= 0) break

        const remainingOnInvoice = invoice.remainingAmount

        // Luăm minimul dintre ce am, și ce trebuie plătit
        let amountToAllocate = Math.min(
          invoice.remainingAmount,
          currentUnallocated,
        )

        amountToAllocate = round2(amountToAllocate)

        if (amountToAllocate <= 0) continue

        // Capturăm detaliile alocării
        allocationDetails.push({
          invoiceNumber: `${invoice.seriesName || ''}-${invoice.invoiceNumber || ''}`,
          allocatedAmount: amountToAllocate,
        })

        // 5. Crearea Alocării
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
          { session },
        )

        // 6. Actualizarea Facturii
        invoice.paidAmount = round2(invoice.paidAmount + amountToAllocate)
        invoice.remainingAmount = round2(
          invoice.remainingAmount - amountToAllocate,
        )
        await invoice.save({ session })

        // 7. Actualizăm suma rămasă de alocat
        currentUnallocated = round2(currentUnallocated - amountToAllocate)
      }

      // 8. Actualizarea Finală a Încasării
      newPayment.unallocatedAmount = currentUnallocated
      return await newPayment.save({ session })
    })

    await session.endSession()

    if (!newPaymentDoc) {
      throw new Error('Tranzacția nu a returnat un document de plată.')
    }

    revalidatePath('/financial/invoices')
    revalidatePath('/admin/management/incasari-si-plati/receivables')
    revalidatePath(`/clients/${newPaymentDoc.clientId.toString()}`)

    try {
      // 'auto-recalc' e un slug fictiv, nu contează pentru logica de calcul, doar pt revalidare
      await recalculateClientSummary(
        newPaymentDoc.clientId.toString(),
        'auto-recalc',
        true,
      )
    } catch (err) {
      console.error('Eroare recalculare sold (create payment):', err)
    }

    return {
      success: true,
      message: `Încasarea ${newPaymentDoc.paymentNumber} de ${formatCurrency(newPaymentDoc.totalAmount)} a fost salvată.`,
      data: JSON.parse(JSON.stringify(newPaymentDoc)),
      allocationDetails: allocationDetails, // <-- NOU: Returnăm detaliile
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
export async function getClientPayments(
  page = 1,
  limit = RECEIVABLES_PAGE_SIZE,
  filters?: {
    search?: string
    status?: string // 'ALL', 'NEALOCATA', 'ALOCAT_COMPLET', etc.
    from?: string
    to?: string
  },
) {
  try {
    await connectToDatabase()

    const skip = (page - 1) * limit
    const pipeline: PipelineStage[] = []

    // 1. CONSTRUIRE FILTRE DE BAZĂ ($match)
    // Începem cu un match gol și adăugăm condiții
    const matchStage: any = {}

    // --- FILTRU STATUS ---
    if (filters?.status && filters.status !== 'ALL') {
      matchStage.status = filters.status
    }

    // --- FILTRU DATĂ (Payment Date) ---
    if (filters?.from || filters?.to) {
      matchStage.paymentDate = {}
      if (filters.from) {
        matchStage.paymentDate.$gte = new Date(filters.from)
      }
      if (filters.to) {
        const toDate = new Date(filters.to)
        toDate.setHours(23, 59, 59, 999)
        matchStage.paymentDate.$lte = toDate
      }
    }

    // Adăugăm stagiul doar dacă avem filtre
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage })
    }

    // 2. LOOKUP CLIENT
    pipeline.push({
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'clientDoc',
      },
    })

    pipeline.push({
      $unwind: { path: '$clientDoc', preserveNullAndEmptyArrays: true },
    })

    // 3. FILTRU CĂUTARE TEXT
    if (filters?.search) {
      const searchRegex = { $regex: filters.search, $options: 'i' }
      pipeline.push({
        $match: {
          $or: [
            { paymentNumber: searchRegex },
            { seriesName: searchRegex },
            { 'clientDoc.name': searchRegex },
            { referenceDocument: searchRegex },
          ],
        },
      })
    }

    // 4. FACET
    pipeline.push({
      $facet: {
        totalCount: [{ $count: 'count' }],
        summary: [
          {
            $group: {
              _id: null,
              totalCollected: { $sum: '$totalAmount' },
            },
          },
        ],
        data: [
          { $sort: { paymentDate: -1, _id: -1 } }, // Cele mai recente primele
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              paymentNumber: 1,
              seriesName: 1,
              paymentDate: 1,
              totalAmount: 1,
              unallocatedAmount: 1,
              status: 1,
              paymentMethod: 1,
              referenceDocument: 1,
              clientId: {
                _id: '$clientDoc._id',
                name: '$clientDoc.name',
              },
            },
          },
        ],
      },
    })

    const result = await ClientPaymentModel.aggregate(pipeline)
    const facetResult = result[0]

    const data = facetResult.data || []
    const totalItems = facetResult.totalCount[0]?.count || 0
    const summaryTotal = facetResult.summary[0]?.totalCollected || 0
    const totalPages = Math.ceil(totalItems / limit)

    return {
      success: true,
      data: JSON.parse(JSON.stringify(data)),
      summaryTotal,
      pagination: {
        total: totalItems,
        page,
        totalPages,
      },
    }
  } catch (error) {
    console.error('❌ Eroare getClientPayments:', error)
    return {
      success: false,
      data: [],
      summaryTotal: 0,
      message: (error as Error).message,
      pagination: { total: 0, page: 1, totalPages: 0 },
    }
  }
}
export async function cancelClientPayment(
  paymentId: string,
): Promise<{ success: boolean; message: string }> {
  await connectToDatabase()
  const session = await startSession()

  // Variabilă pentru a ține minte clientul ca să-i recalculăm soldul la final
  let clientIdToRecalc = ''

  try {
    await session.withTransaction(async (session) => {
      // 1. Validare și Autentificare
      const authSession = await auth()
      if (!authSession?.user?.id) throw new Error('Utilizator neautentificat.')
      if (!Types.ObjectId.isValid(paymentId))
        throw new Error('ID Plată invalid.')

      // 2. Găsește Încasarea
      const payment =
        await ClientPaymentModel.findById(paymentId).session(session)
      if (!payment) throw new Error('Încasarea nu a fost găsită.')

      // SALVĂM ID-UL CLIENTULUI PENTRU RECALCULARE ULTERIOARĂ
      clientIdToRecalc = payment.clientId.toString()

      // 3. Verificări de Business
      if (payment.status === 'ANULATA') {
        throw new Error('Încasarea este deja anulată.')
      }

      // Nu permitem anularea directă dacă are alocări
      if (
        payment.status === 'PARTIAL_ALOCAT' ||
        payment.status === 'ALOCAT_COMPLET'
      ) {
        throw new Error(
          'Încasarea are alocări active și nu poate fi anulată direct. Vă rugăm anulați alocările existente manual.',
        )
      }

      // Verificare suplimentară
      const allocationCount = await PaymentAllocationModel.countDocuments({
        paymentId: new Types.ObjectId(paymentId),
      }).session(session)

      if (allocationCount > 0) {
        throw new Error(
          'Eroare de integritate: Încasarea este NEALOCATA dar are alocări în baza de date.',
        )
      }

      // 4. Actualizează Statusul
      payment.status = 'ANULATA'
      await payment.save({ session })
    })

    await session.endSession()

    // --- RECALCULARE SOLD ---
    if (clientIdToRecalc) {
      try {
        await recalculateClientSummary(clientIdToRecalc, 'auto-recalc', true)
      } catch (err) {
        console.error('Eroare recalculare sold (cancel payment):', err)
      }
    }
    // ------------------------

    revalidatePath('/admin/management/incasari-si-plati/receivables')

    return { success: true, message: 'Încasarea a fost anulată cu succes.' }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare cancelClientPayment:', error)
    return { success: false, message: (error as Error).message }
  }
}
export async function getClientPaymentById(
  paymentId: string,
): Promise<GetPaymentResult> {
  try {
    await connectToDatabase()
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new Error('ID Încasare invalid.')
    }

    const payment = await ClientPaymentModel.findById(paymentId)
      .populate<{ clientId: { _id: string; name: string } }>({
        path: 'clientId',
        model: ClientModel,
        select: 'name',
      })
      .lean()

    if (!payment) {
      throw new Error('Încasarea nu a fost găsită.')
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payment)) as PopulatedClientPayment,
    }
  } catch (error) {
    console.error('❌ Eroare getClientPaymentById:', error)
    return { success: false, data: null, message: (error as Error).message }
  }
}
export async function getReceivablesCounts() {
  try {
    await connectToDatabase()

    const [invoicesCount, receiptsCount] = await Promise.all([
      // 1. Numărăm Facturile Neîncasate (Criterii identice cu lista)
      InvoiceModel.countDocuments({
        invoiceType: { $ne: 'PROFORMA' },
        status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
        remainingAmount: { $ne: 0 },
        seriesName: { $ne: 'INIT-AMB' },
      }),

      // 2. Numărăm Încasările (Total)
      ClientPaymentModel.countDocuments({}),
    ])

    return {
      invoices: invoicesCount,
      receipts: receiptsCount,
    }
  } catch (error) {
    console.error('Err getReceivablesCounts:', error)
    return { invoices: 0, receipts: 0 }
  }
}
export async function getInvoiceWithAllocations(invoiceId: string) {
  // 1. Refolosim funcția ta pentru a lua factura
  const invoiceResult = await getInvoiceById(invoiceId)

  if (!invoiceResult.success || !invoiceResult.data) {
    return {
      success: false,
      message: invoiceResult.message || 'Factura nu a fost găsită.',
    }
  }

  try {
    await connectToDatabase()

    // 2. Luăm separat alocările (plățile) pentru această factură
    // Asta lipsea din funcția originală
    const allocations = await PaymentAllocationModel.find({
      invoiceId: new Types.ObjectId(invoiceId),
    })
      .populate(
        'paymentId',
        'seriesName paymentNumber paymentDate paymentMethod',
      )
      .sort({ createdAt: -1 })
      .lean()

    // 3. Returnăm ambele seturi de date
    return {
      success: true,
      data: {
        invoice: invoiceResult.data, // Datele din funcția ta
        allocations: JSON.parse(JSON.stringify(allocations)), // Alocările pentru tabelul de jos
      },
    }
  } catch (error) {
    console.error('Eroare la preluarea alocărilor:', error)
    // Chiar dacă crapă alocările, măcar returnăm factura ca să se vadă ceva
    return {
      success: true,
      data: {
        invoice: invoiceResult.data,
        allocations: [],
      },
    }
  }
}
