'use server'

import { startSession, Types } from 'mongoose'
import { auth } from '@/auth'
import InvoiceModel from '../invoices/invoice.model'
import PaymentModel from './payment.model'
import { round2 } from '@/lib/utils'
import { connectToDatabase } from '@/lib/db'
import { CreateReceiptInput } from './validator'
import { PaymentActionResult } from './types'
import ClientModel from '../../client/client.model'
import { IClientDoc } from '../../client/types'

export async function recordPayment(
  data: CreateReceiptInput
): Promise<PaymentActionResult> {
  await connectToDatabase()
  const session = await startSession()

  // Ținem numele clientului în scope-ul exterior pentru mesajul de succes
  let clientName: string = 'Client Necunoscut'

  try {
    // Atribuim direct rezultatul tranzacției ---
    const newPaymentDoc = await session.withTransaction(async (session) => {
      // 1. Validare și Audit
      const authSession = await auth()
      const userId = authSession?.user?.id
      const userName = authSession?.user?.name
      if (!userId || !userName) throw new Error('Utilizator neautentificat.')

      if (data.amount <= 0) throw new Error('Suma trebuie să fie pozitivă.')

      // 2. Găsește Numele Clientului
      const client = (await ClientModel.findById(data.clientId)
        .select('name')
        .lean()
        .session(session)) as unknown as IClientDoc | null

      clientName = client?.name || 'Client Necunoscut'

      // 3. Procesare Sume Aplicate
      let totalApplied = 0
      const appliedToInvoices = []

      for (const app of data.appliedToInvoices) {
        if (app.amountApplied <= 0) continue

        const invoice = await InvoiceModel.findById(app.invoiceId).session(
          session
        )
        if (!invoice)
          throw new Error(`Factura ${app.invoiceId} nu a fost găsită.`)

        const remainingOnInvoice = round2(invoice.remainingAmount)

        if (round2(app.amountApplied) > remainingOnInvoice) {
          throw new Error(
            `Suma aplicată (${app.amountApplied}) este mai mare decât restul de plată (${remainingOnInvoice}) pentru factura ${invoice.invoiceNumber}.`
          )
        }

        // --- Logica de actualizare a facturii ---
        invoice.paidAmount = round2(invoice.paidAmount + app.amountApplied)
        invoice.remainingAmount = round2(
          invoice.remainingAmount - app.amountApplied
        )

        if (invoice.remainingAmount <= 0) {
          invoice.status = 'PAID'
          invoice.remainingAmount = 0
        }
        await invoice.save({ session })
        // --- Sfârșit Logica de actualizare ---

        totalApplied = round2(totalApplied + app.amountApplied)
        appliedToInvoices.push({
          invoiceId: new Types.ObjectId(app.invoiceId),
          amountApplied: app.amountApplied,
        })
      }

      if (round2(data.amount) !== totalApplied) {
        throw new Error(
          `Suma totală a plății (${data.amount}) nu se potrivește cu suma totală aplicată (${totalApplied}).`
        )
      }

      // 4. Creare Plată (FĂRĂ generare de număr)
      const [newPayment] = await PaymentModel.create(
        [
          {
            clientId: new Types.ObjectId(data.clientId),
            partnerType: 'Client',
            paymentDate: data.paymentDate,
            amount: data.amount,
            currency: 'RON',
            direction: data.direction,
            documentType: data.documentType,
            seriesName: data.seriesName,
            documentNumber: data.documentNumber,
            notes: data.notes,
            appliedToInvoices: appliedToInvoices,
            createdBy: new Types.ObjectId(userId),
            createdByName: userName,
          },
        ],
        { session }
      )

      return newPayment //  Returnăm documentul ---
    })

    await session.endSession()

    //: Verificăm rezultatul tranzacției --- 🔽
    if (!newPaymentDoc) {
      throw new Error(
        'Eroare la salvarea plății: tranzacția nu a returnat un document.'
      )
    }

    const successMessage = `Plata în valoare de ${newPaymentDoc.amount.toFixed(
      2
    )} RON făcută de ${clientName} cu documentul ${
      newPaymentDoc.documentType
    } ${
      newPaymentDoc.seriesName ? `seria ${newPaymentDoc.seriesName}` : ''
    } nr. ${newPaymentDoc.documentNumber} a fost salvată.`

    return {
      success: true,
      message: successMessage,
      data: JSON.parse(JSON.stringify(newPaymentDoc)),
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction()
    }
    await session.endSession()
    console.error('❌ Eroare recordPayment:', error)
    return { success: false, message: (error as Error).message }
  }
}
