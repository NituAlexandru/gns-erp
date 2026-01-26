'use server'

import { startSession, Types } from 'mongoose'
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

      // 4. LOGICA DE ALOCARE AUTOMATĂ (FIFO)
      const invoicesToPay = await InvoiceModel.find({
        clientId: validatedData.clientId,
        status: { $in: ['APPROVED', 'PARTIAL_PAID'] },
        remainingAmount: { $gt: 0 },
        seriesName: { $ne: 'INIT-AMB' },
      })
        .sort({ dueDate: 1 })
        .session(session)

      for (const invoice of invoicesToPay) {
        if (currentUnallocated <= 0) {
          break
        }

        const remainingOnInvoice = invoice.remainingAmount
        let amountToAllocate = 0

        if (currentUnallocated >= remainingOnInvoice) {
          amountToAllocate = remainingOnInvoice
        } else {
          amountToAllocate = currentUnallocated
        }

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

export async function getClientPayments() {
  try {
    await connectToDatabase()

    const payments = await ClientPaymentModel.find()
      .populate({
        path: 'clientId',
        model: ClientModel,
        select: 'name',
      })
      .sort({ paymentDate: -1 })
      .lean()

    return {
      success: true,
      data: JSON.parse(JSON.stringify(payments)),
    }
  } catch (error) {
    console.error('❌ Eroare getClientPayments:', error)
    return { success: false, data: [] }
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
